import { Env } from '../types/env.js';
import { ContentLifecycle } from '../handlers/expiration.js';
import { ValidationError } from '../types/errors.js';
import { Validator } from '../validators/index.js';
import { Sanitizer } from '../utils/sanitizer.js';
import { Logger } from '../utils/logger.js';

interface ContentItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  tags: string;
  file_key?: string;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  archive_status: 'active' | 'personal' | 'community';
  community_archive_eligible: boolean;
  is_ephemeral: boolean;
  expires_at?: number;
  view_count: number;
}

interface ContentCreateData {
  title: string;
  description: string;
  type: string;
  category: string;
  tags: string[] | string;
  isPublic: boolean;
  fileKey?: string;
  expiresIn?: number; // Number of days, 0 for no expiration
  isEphemeral?: boolean;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
}

export class ContentHandler {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ContentHandler');
  }

  /**
   * Create a new content item
   * @param userId User ID of the content creator
   * @param data Content parameters
   * @param env Environment bindings
   * @returns Created content ID
   */
  async createContent(userId: string, data: ContentCreateData, env: Env): Promise<string> {
    // Validate content data
    const validation = Validator.validateContentCreation(data);
    if (!validation.valid) {
      throw new ValidationError(validation.errors?.join(', ') || 'Invalid content data');
    }

    const contentId = crypto.randomUUID();
    const now = Date.now();

    // Calculate expiration if provided
    // Default: 7 days for ephemeral content, null for permanent
    const isEphemeral = data.isEphemeral !== undefined ? data.isEphemeral : true;
    const expiresAt = isEphemeral
      ? data.expiresIn === 0
        ? null
        : now + (data.expiresIn || 7) * 24 * 60 * 60 * 1000
      : null;

    // Format tags as a comma-separated string
    const tagsString = Array.isArray(data.tags)
      ? data.tags.join(',')
      : typeof data.tags === 'string'
        ? data.tags
        : '';

    // Sanitize inputs
    const sanitizedTitle = Sanitizer.sanitizeText(data.title, 200);
    const sanitizedDescription = Sanitizer.sanitizeText(data.description, 5000);
    const sanitizedCategory = Sanitizer.sanitizeText(data.category, 50);
    const sanitizedTags = Sanitizer.sanitizeText(tagsString, 500);

    // Create content record
    await env.R3L_DB.prepare(
      `
      INSERT INTO content (
        id, user_id, title, description, type, category, tags,
        file_key, is_public, created_at, updated_at,
        archive_status, community_archive_eligible, is_ephemeral, expires_at, view_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        contentId,
        userId,
        sanitizedTitle,
        sanitizedDescription,
        data.type,
        sanitizedCategory,
        sanitizedTags,
        data.fileKey || null,
        data.isPublic ? 1 : 0,
        now,
        now,
        'active',
        0,
        isEphemeral ? 1 : 0,
        expiresAt,
        0
      )
      .run();

    // If location data is provided, store it
    if (data.location) {
      if (Sanitizer.validateCoordinates(data.location.lat, data.location.lng)) {
        await env.R3L_DB.prepare(
          `
          INSERT INTO content_location (
            id, content_id, lat, lng, location_name
          )
          VALUES (?, ?, ?, ?, ?)
        `
        )
          .bind(
            crypto.randomUUID(),
            contentId,
            data.location.lat,
            data.location.lng,
            data.location.name ? Sanitizer.sanitizeText(data.location.name, 100) : null
          )
          .run();
      } else {
        this.logger.warn('Invalid coordinates provided for content', {
          contentId,
          location: data.location,
        });
      }
    }

    // Schedule content for expiration (if ephemeral)
    if (isEphemeral && expiresAt) {
      const lifecycle = new ContentLifecycle();
      await lifecycle.scheduleExpiry(contentId, expiresAt, userId, env);

      this.logger.info('Content scheduled for expiration', {
        contentId,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    }

    return contentId;
  }

  /**
   * Get a content item by ID
   * @param contentId Content ID
   * @param env Environment bindings
   * @returns Content item or null if not found
   */
  async getContent(contentId: string, env: Env): Promise<ContentItem | null> {
    const content = await env.R3L_DB.prepare(
      `
      SELECT * FROM content WHERE id = ?
    `
    )
      .bind(contentId)
      .first<ContentItem>();

    return content || null;
  }

  /**
   * Check if a user can access a content item
   * @param contentId Content ID
   * @param userId User ID
   * @param env Environment bindings
   * @returns Whether user can access content
   */
  async canAccessContent(contentId: string, userId: string | null, env: Env): Promise<boolean> {
    const content = await this.getContent(contentId, env);

    if (!content) {
      return false;
    }

    // Public content is accessible to all
    if (content.is_public) {
      return true;
    }

    // Private content is only accessible to the owner
    return userId !== null && content.user_id === userId;
  }

  /**
   * Increment view count for content
   * @param contentId Content ID
   * @param env Environment bindings
   */
  async incrementViewCount(contentId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(
      `
      UPDATE content
      SET view_count = view_count + 1
      WHERE id = ?
    `
    )
      .bind(contentId)
      .run();
  }

  /**
   * Update a content item
   * @param contentId Content ID
   * @param userId User ID (for authorization)
   * @param updates Updates to apply
   * @param env Environment bindings
   */
  async updateContent(
    contentId: string,
    userId: string,
    updates: Partial<{
      title: string;
      description: string;
      category: string;
      tags: string[] | string;
      isPublic: boolean;
      isEphemeral: boolean;
      expiresIn: number; // Days until expiration, 0 for no expiration
    }>,
    env: Env
  ): Promise<void> {
    const content = await this.getContent(contentId, env);

    if (!content) {
      throw new ValidationError('Content not found');
    }

    // Check ownership
    if (content.user_id !== userId) {
      throw new ValidationError('Unauthorized to update this content');
    }

    const updateFields = [];
    const values = [];

    // Sanitize and add updates
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(Sanitizer.sanitizeText(updates.title, 200));
    }

    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(Sanitizer.sanitizeText(updates.description, 5000));
    }

    if (updates.category !== undefined) {
      updateFields.push('category = ?');
      values.push(Sanitizer.sanitizeText(updates.category, 50));
    }

    if (updates.tags !== undefined) {
      const tagsString = Array.isArray(updates.tags) ? updates.tags.join(',') : updates.tags;
      updateFields.push('tags = ?');
      values.push(Sanitizer.sanitizeText(tagsString, 500));
    }

    if (updates.isPublic !== undefined) {
      updateFields.push('is_public = ?');
      values.push(updates.isPublic ? 1 : 0);
    }

    // Handle ephemerality and expiration changes
    if (updates.isEphemeral !== undefined) {
      updateFields.push('is_ephemeral = ?');
      values.push(updates.isEphemeral ? 1 : 0);

      // If changing to non-ephemeral, clear expiration
      if (!updates.isEphemeral) {
        updateFields.push('expires_at = NULL');
      } else if (updates.expiresIn !== undefined) {
        // Set new expiration date if provided
        const expiresAt =
          updates.expiresIn === 0 ? null : Date.now() + updates.expiresIn * 24 * 60 * 60 * 1000;

        updateFields.push('expires_at = ?');
        values.push(expiresAt);

        // Update lifecycle record
        if (expiresAt) {
          const lifecycle = new ContentLifecycle();
          await lifecycle.scheduleExpiry(contentId, expiresAt, userId, env);
        } else {
          await env.R3L_DB.prepare(
            `
            UPDATE content_lifecycle
            SET expires_at = NULL
            WHERE content_id = ?
          `
          )
            .bind(contentId)
            .run();
        }
      }
    } else if (updates.expiresIn !== undefined && content.is_ephemeral) {
      // Only update expiration if content is already ephemeral
      const expiresAt =
        updates.expiresIn === 0 ? null : Date.now() + updates.expiresIn * 24 * 60 * 60 * 1000;

      updateFields.push('expires_at = ?');
      values.push(expiresAt);

      // Update lifecycle record
      if (expiresAt) {
        const lifecycle = new ContentLifecycle();
        await lifecycle.updateExpiry(contentId, expiresAt, userId, env);
      } else {
        await env.R3L_DB.prepare(
          `
          UPDATE content_lifecycle
          SET expires_at = NULL
          WHERE content_id = ?
        `
        )
          .bind(contentId)
          .run();
      }
    }

    if (updateFields.length === 0) {
      // Nothing to update
      return;
    }

    // Add updated_at and content_id
    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(contentId);

    await env.R3L_DB.prepare(
      `
      UPDATE content
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `
    )
      .bind(...values)
      .run();

    this.logger.info('Content updated', { contentId, userId });
  }

  /**
   * Delete a content item
   * @param contentId Content ID
   * @param userId User ID (for authorization)
   * @param env Environment bindings
   */
  async deleteContent(contentId: string, userId: string, env: Env): Promise<void> {
    const content = await this.getContent(contentId, env);

    if (!content) {
      throw new ValidationError('Content not found');
    }

    // Check ownership
    if (content.user_id !== userId) {
      throw new ValidationError('Unauthorized to delete this content');
    }

    // Delete file if exists
    if (content.file_key) {
      try {
        await env.R3L_CONTENT_BUCKET.delete(content.file_key);
        this.logger.info('Deleted content file', { contentId, fileKey: content.file_key });
      } catch (error) {
        this.logger.error('Failed to delete content file', error as Error, {
          contentId,
          fileKey: content.file_key,
        });
      }
    } // Delete content (cascades will handle related records)
    await env.R3L_DB.prepare(
      `
      DELETE FROM content WHERE id = ?
    `
    )
      .bind(contentId)
      .run();

    this.logger.info('Content deleted', { contentId, userId });
  }

  /**
   * Get recent content
   * @param limit Maximum number of items
   * @param offset Pagination offset
   * @param userId Optional user ID to include private content
   * @param env Environment bindings
   * @returns Array of content items
   */
  async getRecentContent(
    limit: number = 20,
    offset: number = 0,
    env: Env,
    userId?: string
  ): Promise<ContentItem[]> {
    let query = `
      SELECT * FROM content
      WHERE (is_public = 1
    `;

    const params = [];

    if (userId) {
      query += ` OR user_id = ?)`;
      params.push(userId);
    } else {
      query += `)`;
    }

    // Only show active content that hasn't expired
    query += `
      AND archive_status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(Date.now(), limit, offset);

    const result = await env.R3L_DB.prepare(query)
      .bind(...params)
      .all<ContentItem>();
    return result.results || [];
  }

  /**
   * Archive content personally (by owner)
   * @param contentId Content ID
   * @param userId User ID (for authorization)
   * @param env Environment bindings
   */
  async archiveContentPersonally(contentId: string, userId: string, env: Env): Promise<void> {
    const content = await this.getContent(contentId, env);

    if (!content) {
      throw new ValidationError('Content not found');
    }

    // Check ownership
    if (content.user_id !== userId) {
      throw new ValidationError('Unauthorized to archive this content');
    }

    // Update content status
    await env.R3L_DB.prepare(
      `
      UPDATE content
      SET archive_status = 'personal',
          community_archive_eligible = 1,
          expires_at = NULL
      WHERE id = ?
    `
    )
      .bind(contentId)
      .run();

    // Update lifecycle record
    await env.R3L_DB.prepare(
      `
      UPDATE content_lifecycle
      SET archived_at = ?,
          archive_type = 'personal',
          expires_at = NULL
      WHERE content_id = ?
    `
    )
      .bind(Date.now(), contentId)
      .run();

    this.logger.info('Content archived personally', { contentId, userId });
  }

  /**
   * Vote for community archiving
   * @param contentId Content ID
   * @param userId User ID casting the vote
   * @param env Environment bindings
   * @returns Current vote count and threshold info
   */
  async voteForCommunityArchive(
    contentId: string,
    userId: string,
    env: Env
  ): Promise<{ votes: number; threshold: number; status: string }> {
    const content = await this.getContent(contentId, env);

    if (!content) {
      throw new ValidationError('Content not found');
    }

    // Check if already voted
    const existingVote = await env.R3L_DB.prepare(
      `
      SELECT id FROM archive_votes
      WHERE content_id = ? AND user_id = ?
    `
    )
      .bind(contentId, userId)
      .first();

    if (existingVote) {
      throw new ValidationError('User has already voted to archive this content');
    }

    // Add vote
    await env.R3L_DB.prepare(
      `
      INSERT INTO archive_votes (id, content_id, user_id, voted_at)
      VALUES (?, ?, ?, ?)
    `
    )
      .bind(crypto.randomUUID(), contentId, userId, Date.now())
      .run();

    const voteResult = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) as vote_count FROM archive_votes
      WHERE content_id = ?
    `
    )
      .bind(contentId)
      .first<{ vote_count: number }>();

    const votes = voteResult?.vote_count || 0;
    const ageInDays = (Date.now() - content.created_at) / (24 * 60 * 60 * 1000);
    
    // Pure vote-based threshold to prevent algorithmic bias from engagement metrics
    // Base threshold: 5 votes, reduced by age to encourage preservation of older content
    let threshold = 5;
    
    // Reduce threshold for older content (encourage preservation)
    threshold -= Math.min(2, Math.floor(ageInDays / 7)); // -1 vote per week, max -2
    
    // Ensure minimum threshold of 3 votes
    threshold = Math.max(3, threshold);

    let status = 'pending';

    // Check if threshold is reached
    if (votes >= threshold) {
      // Archive the content permanently
      await env.R3L_DB.prepare(
        `
        UPDATE content
        SET archive_status = 'community',
            expires_at = NULL,
            community_archive_eligible = 1
        WHERE id = ?
      `
      )
        .bind(contentId)
        .run();

      // Update lifecycle record
      await env.R3L_DB.prepare(
        `
        UPDATE content_lifecycle
        SET archived_at = ?,
            archive_type = 'community',
            expires_at = NULL
        WHERE content_id = ?
      `
      )
        .bind(Date.now(), contentId)
        .run();

      status = 'archived';

      this.logger.info('Content archived by community vote', {
        contentId,
        votes,
        threshold,
      });
    }

    return { votes, threshold, status };
  }

  /**
   * Record a content download/bookmark
   * @param contentId Content ID
   * @param userId User ID downloading the content
   * @param env Environment bindings
   */
  async recordDownload(contentId: string, userId: string, env: Env): Promise<void> {
    const content = await this.getContent(contentId, env);

    if (!content) {
      throw new ValidationError('Content not found');
    }

    // Record the download
    await env.R3L_DB.prepare(
      `
      INSERT INTO content_downloads (id, content_id, user_id, downloaded_at)
      VALUES (?, ?, ?, ?)
    `
    )
      .bind(crypto.randomUUID(), contentId, userId, Date.now())
      .run();

    // Also count as an archive vote if user hasn't voted yet
    const existingVote = await env.R3L_DB.prepare(
      `
      SELECT id FROM archive_votes
      WHERE content_id = ? AND user_id = ?
    `
    )
      .bind(contentId, userId)
      .first();

    if (!existingVote) {
      await env.R3L_DB.prepare(
        `
        INSERT INTO archive_votes (id, content_id, user_id, voted_at)
        VALUES (?, ?, ?, ?)
      `
      )
        .bind(crypto.randomUUID(), contentId, userId, Date.now())
        .run();
    }

    this.logger.info('Content download recorded', { contentId, userId });

    this.logger.info('Content download recorded', { contentId, userId });
  }

  /**
   * Get a random content item
   * @param env Environment bindings
   * @returns A random public content item
   */
  async getRandomContent(env: Env): Promise<ContentItem | null> {
    // Get a random public content
    const content = await env.R3L_DB.prepare(
      `
      SELECT * FROM content
      WHERE is_public = 1
      AND archive_status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY RANDOM()
      LIMIT 1
    `
    )
      .bind(Date.now())
      .first<ContentItem>();

    return content || null;
  }

  /**
   * Get content location
   * @param contentId Content ID
   * @param env Environment bindings
   * @returns Location data or null
   */
  async getContentLocation(
    contentId: string,
    env: Env
  ): Promise<{
    lat: number;
    lng: number;
    location_name?: string;
  } | null> {
    const location = await env.R3L_DB.prepare(
      `
      SELECT lat, lng, location_name
      FROM content_location
      WHERE content_id = ?
    `
    )
      .bind(contentId)
      .first<{
        lat: number;
        lng: number;
        location_name?: string;
      }>();

    return location || null;
  }

  /**
   * Get anti-algorithmic feed (chronological only)
   * @param userId User ID
   * @param limit Maximum number of items
   * @param offset Pagination offset
   * @param env Environment bindings
   * @returns Content feed items
   */
  async getFeed(
    userId: string,
    limit: number,
    offset: number,
    env: Env
  ): Promise<{
    items: any[];
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    // Get connections first
    const connectionsQuery = `
      SELECT connected_user_id FROM connections
      WHERE user_id = ? AND status = 'accepted'
      UNION
      SELECT user_id FROM connections
      WHERE connected_user_id = ? AND status = 'accepted'
    `;

    const connectionsResult = await env.R3L_DB.prepare(connectionsQuery).bind(userId, userId).all();

    const connections = (connectionsResult.results || []).map((row: any) =>
      String(row.connected_user_id || row.user_id)
    );

    // Add the user's own ID
    connections.push(userId);

    // Prepare placeholders for the IN clause
    const placeholders = connections.map(() => '?').join(',');

    // No algorithm, no engagement optimization
    // Strictly chronological feed - newest first
    const feedQuery = `
      SELECT 
        c.*,
        u.username,
        u.display_name,
        u.avatar_url
      FROM content c
      JOIN users u ON c.user_id = u.id
      WHERE c.archive_status = 'active'
        AND c.user_id IN (${placeholders})
        AND (c.expires_at IS NULL OR c.expires_at > ?)
        AND (c.is_public = 1 OR c.user_id = ?)
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = [...connections, Date.now(), userId, limit, offset];

    const result = await env.R3L_DB.prepare(feedQuery)
      .bind(...params)
      .all();

    return {
      items: result.results || [],
      pagination: {
        limit,
        offset,
        hasMore: (result.results || []).length === limit,
      },
    };
  }

  /**
   * Get a random communique (public content for random viewing)
   * @param env Environment bindings
   * @returns A random communique or null if none found
   */
  async getRandomCommunique(env: Env): Promise<any | null> {
    // Get a random public communique (content of type 'communique')
    const communique = await env.R3L_DB.prepare(
      `
      SELECT 
        c.*,
        u.username,
        u.display_name,
        u.avatar_url
      FROM content c
      JOIN users u ON c.user_id = u.id
      WHERE c.type = 'communique'
        AND c.is_public = 1
        AND c.archive_status = 'active'
        AND (c.expires_at IS NULL OR c.expires_at > ?)
      ORDER BY RANDOM()
      LIMIT 1
    `
    )
      .bind(Date.now())
      .first();

    return communique || null;
  }

  /**
   * Copy content to user's drawer
   * @param contentId Content ID to copy
   * @param userId User ID
   * @param isPublic Whether the copy should be public
   * @param env Environment bindings
   * @returns ID of the new drawer content
   */
  async copyToDrawer(
    contentId: string,
    userId: string,
    isPublic: boolean,
    env: Env
  ): Promise<string> {
    // Get the original content
    const content = await this.getContent(contentId, env);

    if (!content) {
      throw new Error('Content not found');
    }

    // Check if user can access this content
    const canAccess = await this.canAccessContent(contentId, userId, env);

    if (!canAccess) {
      throw new Error('Cannot access this content');
    }

    // Create copy in drawer
    const copyId = crypto.randomUUID();
    const now = Date.now();

    await env.R3L_DB.prepare(
      `
      INSERT INTO drawer_content (
        id,
        user_id,
        content_id,
        note,
        is_public,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(copyId, userId, contentId, `Copy of ${content.title}`, isPublic ? 1 : 0, now)
      .run();

    return copyId;
  }

  /**
   * Get tags for a specific content item
   * @param contentId The ID of the content
   * @param env Environment bindings
   * @returns An array of tag objects
   */
  async getContentTags(contentId: string, env: Env): Promise<{ id: string; name: string }[]> {
    const query = `
      SELECT t.id, t.name
      FROM tags t
      JOIN content_tags ct ON t.id = ct.tag_id
      WHERE ct.content_id = ?
      ORDER BY t.name ASC
    `;

    const result = await env.R3L_DB.prepare(query).bind(contentId).all();
    return (result.results as { id: string; name: string }[]) || [];
  }
}
