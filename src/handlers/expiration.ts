import { Env } from '../types/env';

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

  /**
   * Schedules the expiration of a content item
   * @param contentId The ID of the content to schedule for expiry
   * @param env Environment bindings
   */
  async scheduleExpiry(contentId: string, env: Env): Promise<void> {
    const expiryDate = Date.now() + ContentLifecycle.DEFAULT_LIFESPAN;
    const warningDate = expiryDate - ContentLifecycle.DELETION_WARNING;

    // Mark for deletion → Auto-delete (unless archived)
    await env.R3L_DB.prepare(`
      INSERT INTO content_lifecycle (id, content_id, created_at, expires_at, marked_for_deletion_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), 
      contentId, 
      Date.now(), 
      expiryDate, 
      warningDate
    ).run();
  }

  /**
   * Processes content expirations - sends warnings for content about to expire
   * and deletes content that has reached its expiration date (unless archived)
   * @param env Environment bindings
   */
  async processExpirations(env: Env): Promise<void> {
    const now = Date.now();

    // Send warnings for content about to expire
    const warningResults = await env.R3L_DB.prepare(`
      SELECT cl.content_id, c.user_id, c.title
      FROM content_lifecycle cl
      JOIN content c ON cl.content_id = c.id
      WHERE cl.marked_for_deletion_at <= ?
      AND cl.marked_for_deletion_at > 0
      AND c.archive_status = 'active'
    `).bind(now).all<ContentWarningItem>();

    const warningItems = warningResults.results || [];
    for (const item of warningItems) {
      await this.sendExpirationWarning(item.user_id, item.title, env);
      
      // Update to show warning was sent
      await env.R3L_DB.prepare(`
        UPDATE content_lifecycle 
        SET marked_for_deletion_at = -1
        WHERE content_id = ?
      `).bind(item.content_id).run();
    }

    // Process final deletions
    const expiryResults = await env.R3L_DB.prepare(`
      SELECT cl.content_id, c.user_id, c.title, c.type, c.file_key
      FROM content_lifecycle cl
      JOIN content c ON cl.content_id = c.id
      WHERE cl.expires_at <= ?
      AND c.archive_status = 'active'
    `).bind(now).all<ContentExpiryItem>();

    const expiryItems = expiryResults.results || [];
    for (const item of expiryItems) {
      // Check if community archived
      const archiveStatus = await this.checkCommunityArchiveStatus(item.content_id, env);
      
      if (archiveStatus.eligible) {
        await this.archiveContent(item.content_id, 'community', env);
      } else {
        // Delete content
        if (item.file_key) {
          await env.R3L_CONTENT_BUCKET.delete(item.file_key);
        }
        
        await env.R3L_DB.prepare(`
          DELETE FROM content WHERE id = ?
        `).bind(item.content_id).run();
        
        await env.R3L_DB.prepare(`
          DELETE FROM content_lifecycle WHERE content_id = ?
        `).bind(item.content_id).run();
      }
    }
  }

  /**
   * Checks if content is eligible for community archiving
   * @param contentId Content ID to check
   * @param env Environment bindings
   * @returns Object with eligible boolean
   */
  private async checkCommunityArchiveStatus(contentId: string, env: Env): Promise<{eligible: boolean}> {
    const result = await env.R3L_DB.prepare(`
      SELECT COUNT(*) as vote_count
      FROM community_archive_votes
      WHERE content_id = ?
    `).bind(contentId).first<VoteCountResult>();
    
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
  private async archiveContent(contentId: string, type: 'personal' | 'community', env: Env): Promise<void> {
    await env.R3L_DB.prepare(`
      UPDATE content
      SET archive_status = ?,
          community_archive_eligible = TRUE
      WHERE id = ?
    `).bind(type, contentId).run();
    
    await env.R3L_DB.prepare(`
      UPDATE content_lifecycle
      SET archived_at = ?,
          archive_type = ?,
          expires_at = NULL
      WHERE content_id = ?
    `).bind(Date.now(), type, contentId).run();
  }

  /**
   * Sends a notification to the user about content that is about to expire
   * @param userId User to notify
   * @param title Content title for the notification
   * @param env Environment bindings
   */
  private async sendExpirationWarning(userId: string, title: string, env: Env): Promise<void> {
    // Send notification to user about content expiration
    await env.R3L_DB.prepare(`
      INSERT INTO notifications (id, user_id, type, message, created_at, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      'expiration_warning',
      `Your content "${title}" will be deleted in 24 hours unless archived.`,
      Date.now(),
      0
    ).run();
  }
}
