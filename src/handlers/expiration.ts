import { Env } from '../types/env';
import { Logger } from '../utils/logger';

// Define interfaces for query results
interface ContentWarningItem {
  content_id: string;
  user_id: string;
  title: string;
}

interface ContentExpiryItem {
  content_id: string;
  user_id: string;
  title: string;
  type?: string;
  file_key?: string;
}

interface VoteCountResult {
  vote_count: number;
}

export class ContentLifecycle {
  static readonly DEFAULT_LIFESPAN = 7 * 24 * 60 * 60 * 1000; // 7 days
  static readonly DELETION_WARNING = 24 * 60 * 60 * 1000; // 24 hour warning

  private logger: Logger;

  constructor() {
    this.logger = new Logger('ContentLifecycle');
  }

  /**
   * Schedules the expiration of a content item
   * @param contentId The ID of the content to schedule for expiry
   * @param expiresAt Timestamp when content expires
   * @param userId User ID who owns the content
   * @param env Environment bindings
   */
  async scheduleExpiry(
    contentId: string,
    expiresAt: number,
    userId: string,
    env: Env
  ): Promise<void> {
    const warningDate = expiresAt - ContentLifecycle.DELETION_WARNING;

    // Mark for deletion → Auto-delete (unless archived)
    await env.R3L_DB.prepare(
      `
      INSERT INTO content_lifecycle (id, content_id, created_at, expires_at, marked_for_deletion_at)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(crypto.randomUUID(), contentId, Date.now(), expiresAt, warningDate)
      .run();

    this.logger.info('Content scheduled for expiration', {
      contentId,
      userId,
      expiresAt: new Date(expiresAt).toISOString(),
      warningAt: new Date(warningDate).toISOString(),
    });
  }

  /**
   * Updates the expiration of a content item
   * @param contentId The ID of the content to update
   * @param expiresAt New expiration timestamp
   * @param userId User ID who owns the content
   * @param env Environment bindings
   */
  async updateExpiry(
    contentId: string,
    expiresAt: number | null,
    userId: string,
    env: Env
  ): Promise<void> {
    // If null, cancel expiration
    if (expiresAt === null) {
      await this.cancelExpiry(contentId, env);
      return;
    }

    const warningDate = expiresAt - ContentLifecycle.DELETION_WARNING;

    // Check if lifecycle entry exists
    const existing = await env.R3L_DB.prepare(
      `
      SELECT id FROM content_lifecycle WHERE content_id = ?
    `
    )
      .bind(contentId)
      .first();

    if (existing) {
      // Update existing entry
      await env.R3L_DB.prepare(
        `
        UPDATE content_lifecycle
        SET expires_at = ?,
            marked_for_deletion_at = ?,
            archived_at = NULL,
            archive_type = NULL
        WHERE content_id = ?
      `
      )
        .bind(expiresAt, warningDate, contentId)
        .run();
    } else {
      // Create new entry
      await this.scheduleExpiry(contentId, expiresAt, userId, env);
    }

    this.logger.info('Content expiration updated', {
      contentId,
      userId,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }

  /**
   * Cancels the expiration for a content item
   * @param contentId The ID of the content
   * @param env Environment bindings
   */
  async cancelExpiry(contentId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(
      `
      UPDATE content
      SET expires_at = NULL
      WHERE id = ?
    `
    )
      .bind(contentId)
      .run();

    await env.R3L_DB.prepare(
      `
      UPDATE content_lifecycle
      SET expires_at = NULL,
          marked_for_deletion_at = NULL
      WHERE content_id = ?
    `
    )
      .bind(contentId)
      .run();

    this.logger.info('Content expiration cancelled', { contentId });
  }

  /**
   * Processes content expirations - sends warnings for content about to expire
   * and deletes content that has reached its expiration date (unless archived)
   * @param env Environment bindings
   */
  async processExpirations(env: Env): Promise<void> {
    const now = Date.now();

    // Send warnings for content about to expire
    const warningResults = await env.R3L_DB.prepare(
      `
      SELECT cl.content_id, c.user_id, c.title
      FROM content_lifecycle cl
      JOIN content c ON cl.content_id = c.id
      WHERE cl.marked_for_deletion_at <= ?
      AND cl.marked_for_deletion_at > 0
      AND c.archive_status = 'active'
    `
    )
      .bind(now)
      .all<ContentWarningItem>();

    const warningItems = warningResults.results || [];
    for (const item of warningItems) {
      await this.sendExpirationWarning(item.user_id, item.title, env);

      // Update to show warning was sent
      await env.R3L_DB.prepare(
        `
        UPDATE content_lifecycle 
        SET marked_for_deletion_at = -1
        WHERE content_id = ?
      `
      )
        .bind(item.content_id)
        .run();

      this.logger.info('Sent expiration warning', {
        contentId: item.content_id,
        userId: item.user_id,
      });
    }

    // Process final deletions
    const expiryResults = await env.R3L_DB.prepare(
      `
      SELECT cl.content_id, c.user_id, c.title, c.type, c.file_key
      FROM content_lifecycle cl
      JOIN content c ON cl.content_id = c.id
      WHERE cl.expires_at <= ?
      AND c.archive_status = 'active'
    `
    )
      .bind(now)
      .all<ContentExpiryItem>();

    const expiryItems = expiryResults.results || [];
    for (const item of expiryItems) {
      // Check if community archived
      const archiveStatus = await this.checkCommunityArchiveStatus(item.content_id, env);

      if (archiveStatus.eligible) {
        await this.archiveContent(item.content_id, 'community', env);
        this.logger.info('Content auto-archived by community votes', {
          contentId: item.content_id,
        });
      } else {
        // Delete content
        if (item.file_key) {
          try {
            await env.R3L_CONTENT_BUCKET.delete(item.file_key);
            this.logger.info('Deleted expired content file', {
              contentId: item.content_id,
              fileKey: item.file_key,
            });
          } catch (error) {
            this.logger.error('Failed to delete expired content file', error as Error, {
              contentId: item.content_id,
              fileKey: item.file_key,
            });
          }
        }

        await env.R3L_DB.prepare(
          `
          DELETE FROM content WHERE id = ?
        `
        )
          .bind(item.content_id)
          .run();

        await env.R3L_DB.prepare(
          `
          DELETE FROM content_lifecycle WHERE content_id = ?
        `
        )
          .bind(item.content_id)
          .run();

        this.logger.info('Content expired and deleted', {
          contentId: item.content_id,
          userId: item.user_id,
        });
      }
    }
  }

  /**
   * Checks if content is eligible for community archiving
   * @param contentId Content ID to check
   * @param env Environment bindings
   * @returns Object with eligible boolean
   */
  private async checkCommunityArchiveStatus(
    contentId: string,
    env: Env
  ): Promise<{ eligible: boolean }> {
    const result = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) as vote_count
      FROM archive_votes
      WHERE content_id = ?
    `
    )
      .bind(contentId)
      .first<VoteCountResult>();

    // If no result, it's not eligible
    if (!result) {
      return { eligible: false };
    }

    return { eligible: result.vote_count >= 5 };
  }

  /**
   * Archives content, either personally or community-wide
   * @param contentId Content ID to archive
   * @param type Type of archiving ('personal' or 'community')
   * @param env Environment bindings
   */
  private async archiveContent(
    contentId: string,
    type: 'personal' | 'community',
    env: Env
  ): Promise<void> {
    await env.R3L_DB.prepare(
      `
      UPDATE content
      SET archive_status = ?,
          community_archive_eligible = 1,
          expires_at = NULL
      WHERE id = ?
    `
    )
      .bind(type, contentId)
      .run();

    await env.R3L_DB.prepare(
      `
      UPDATE content_lifecycle
      SET archived_at = ?,
          archive_type = ?,
          expires_at = NULL
      WHERE content_id = ?
    `
    )
      .bind(Date.now(), type, contentId)
      .run();
  }

  /**
   * Sends a notification to the user about content that is about to expire
   * @param userId User to notify
   * @param title Content title for the notification
   * @param env Environment bindings
   */
  private async sendExpirationWarning(userId: string, title: string, env: Env): Promise<void> {
    // Send notification to user about content expiration
    await env.R3L_DB.prepare(
      `
      INSERT INTO notifications (id, user_id, type, message, created_at, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        crypto.randomUUID(),
        userId,
        'expiration_warning',
        `Your content "${title}" will be deleted in 24 hours unless archived.`,
        Date.now(),
        0
      )
      .run();
  }
}
