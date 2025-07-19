import { Env } from '../types/env';
import { ContentLifecycle } from '../handlers/expiration';

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
}

interface ContentCreationParams {
  title: string;
  description: string;
  type: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  fileKey?: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
}

export class ContentHandler {
  /**
   * Create a new content item
   * @param userId User ID of the content creator
   * @param params Content parameters
   * @param env Environment bindings
   * @returns Created content ID
   */
  async createContent(
    userId: string,
    params: ContentCreationParams,
    env: Env
  ): Promise<string> {
    const contentId = crypto.randomUUID();
    const now = Date.now();
    
    // Format tags as a comma-separated string
    const tagsString = Array.isArray(params.tags) 
      ? params.tags.join(',') 
      : (typeof params.tags === 'string' ? params.tags : '');
    
    // Create content record
    await env.R3L_DB.prepare(`
      INSERT INTO content (
        id, user_id, title, description, type, category, tags,
        file_key, is_public, created_at, updated_at,
        archive_status, community_archive_eligible
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      contentId,
      userId,
      params.title,
      params.description,
      params.type,
      params.category,
      tagsString,
      params.fileKey || null,
      params.isPublic ? 1 : 0,
      now,
      now,
      'active',
      0
    ).run();
    
    // If location data is provided, store it
    if (params.location) {
      await env.R3L_DB.prepare(`
        INSERT INTO content_location (
          id, content_id, lat, lng, location_name
        )
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        contentId,
        params.location.lat,
        params.location.lng,
        params.location.name || null
      ).run();
    }
    
    // Schedule content for expiration (by default)
    const lifecycle = new ContentLifecycle();
    await lifecycle.scheduleExpiry(contentId, env);
    
    return contentId;
  }
  
  /**
   * Get a content item by ID
   * @param contentId Content ID
   * @param env Environment bindings
   * @returns Content item or null if not found
   */
  async getContent(contentId: string, env: Env): Promise<ContentItem | null> {
    const content = await env.R3L_DB.prepare(`
      SELECT * FROM content WHERE id = ?
    `).bind(contentId).first<ContentItem>();
    
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
      tags: string[];
      isPublic: boolean;
    }>,
    env: Env
  ): Promise<void> {
    const content = await this.getContent(contentId, env);
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Check ownership
    if (content.user_id !== userId) {
      throw new Error('Unauthorized to update this content');
    }
    
    const updateFields = [];
    const values = [];
    
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    
    if (updates.category !== undefined) {
      updateFields.push('category = ?');
      values.push(updates.category);
    }
    
    if (updates.tags !== undefined) {
      updateFields.push('tags = ?');
      values.push(Array.isArray(updates.tags) ? updates.tags.join(',') : updates.tags);
    }
    
    if (updates.isPublic !== undefined) {
      updateFields.push('is_public = ?');
      values.push(updates.isPublic ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      // Nothing to update
      return;
    }
    
    // Add updated_at and content_id
    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(contentId);
    
    await env.R3L_DB.prepare(`
      UPDATE content
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
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
      throw new Error('Content not found');
    }
    
    // Check ownership
    if (content.user_id !== userId) {
      throw new Error('Unauthorized to delete this content');
    }
    
    // Delete file if exists
    if (content.file_key) {
      await env.R3L_CONTENT_BUCKET.delete(content.file_key);
    }
    
    // Delete content (cascades will handle related records)
    await env.R3L_DB.prepare(`
      DELETE FROM content WHERE id = ?
    `).bind(contentId).run();
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
    
    query += `
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const result = await env.R3L_DB.prepare(query).bind(...params).all<ContentItem>();
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
      throw new Error('Content not found');
    }
    
    // Check ownership
    if (content.user_id !== userId) {
      throw new Error('Unauthorized to archive this content');
    }
    
    // Update content status
    await env.R3L_DB.prepare(`
      UPDATE content
      SET archive_status = 'personal',
          community_archive_eligible = TRUE
      WHERE id = ?
    `).bind(contentId).run();
    
    // Update lifecycle record
    await env.R3L_DB.prepare(`
      UPDATE content_lifecycle
      SET archived_at = ?,
          archive_type = 'personal',
          expires_at = NULL
      WHERE content_id = ?
    `).bind(Date.now(), contentId).run();
  }
  
  /**
   * Vote for community archiving
   * @param contentId Content ID
   * @param userId User ID casting the vote
   * @param env Environment bindings
   * @returns Current vote count after this vote
   */
  async voteForCommunityArchive(contentId: string, userId: string, env: Env): Promise<number> {
    const content = await this.getContent(contentId, env);
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Check if already voted
    const existingVote = await env.R3L_DB.prepare(`
      SELECT id FROM community_archive_votes
      WHERE content_id = ? AND user_id = ?
    `).bind(contentId, userId).first();
    
    if (existingVote) {
      throw new Error('Already voted for this content');
    }
    
    // Add vote
    await env.R3L_DB.prepare(`
      INSERT INTO community_archive_votes (id, content_id, user_id, vote_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), contentId, userId, 'co_archive', Date.now()).run();
    
    // Update vote count in content table
    await env.R3L_DB.prepare(`
      UPDATE content
      SET archive_votes_count = archive_votes_count + 1
      WHERE id = ?
    `).bind(contentId).run();
    
    // Get updated vote count
    const voteCount = await env.R3L_DB.prepare(`
      SELECT archive_votes_count as count FROM content
      WHERE id = ?
    `).bind(contentId).first<{count: number}>();
    
    // Get system stats for threshold calculation
    const systemStats = await env.R3L_DB.prepare(`
      SELECT total_active_content, archive_threshold_percentage 
      FROM system_stats 
      WHERE id = 'global_stats'
    `).first<{ total_active_content: number, archive_threshold_percentage: number }>();
    
    const threshold = systemStats ? 
      Math.max(5, Math.ceil(systemStats.total_active_content * (systemStats.archive_threshold_percentage / 100))) : 
      5; // Default to 5 votes if no stats available
    
    // If vote count reaches threshold, mark as community archived
    if (voteCount && voteCount.count >= threshold && content.archive_status === 'active') {
      // Update content status
      await env.R3L_DB.prepare(`
        UPDATE content
        SET archive_status = 'community'
        WHERE id = ?
      `).bind(contentId).run();
      
      // Update lifecycle record
      await env.R3L_DB.prepare(`
        UPDATE content_lifecycle
        SET archived_at = ?,
            archive_type = 'community',
            expires_at = NULL
        WHERE content_id = ?
      `).bind(Date.now(), contentId).run();
    }
    
    return voteCount ? voteCount.count : 0;
  }
  
  /**
   * Record a content download and count it as an archive vote
   * @param contentId Content ID
   * @param userId User ID downloading the content
   * @param env Environment bindings
   */
  async recordDownload(contentId: string, userId: string, env: Env): Promise<void> {
    const content = await this.getContent(contentId, env);
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Record the download
    await env.R3L_DB.prepare(`
      INSERT INTO content_downloads (id, content_id, user_id, downloaded_at)
      VALUES (?, ?, ?, ?)
    `).bind(crypto.randomUUID(), contentId, userId, Date.now()).run();
    
    // Also count as an archive vote if user hasn't voted yet
    const existingVote = await env.R3L_DB.prepare(`
      SELECT id FROM community_archive_votes
      WHERE content_id = ? AND user_id = ? AND vote_type = 'bookmark'
    `).bind(contentId, userId).first();
    
    if (!existingVote) {
      await env.R3L_DB.prepare(`
        INSERT INTO community_archive_votes (id, content_id, user_id, vote_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), contentId, userId, 'bookmark', Date.now()).run();
      
      // Update vote count in content table
      await env.R3L_DB.prepare(`
        UPDATE content
        SET archive_votes_count = archive_votes_count + 1
        WHERE id = ?
      `).bind(contentId).run();
    }
  }
  
  /**
   * Copy content to user's drawer (creates a reference rather than duplicating the file)
   * @param contentId Original content ID
   * @param userId User ID who is copying
   * @param isPublic Whether the copy should be public in the user's drawer
   * @param env Environment bindings
   * @returns ID of the copy
   */
  async copyToDrawer(contentId: string, userId: string, isPublic: boolean, env: Env): Promise<string> {
    const content = await this.getContent(contentId, env);
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Check if the content is accessible by this user
    if (!await this.canAccessContent(contentId, userId, env)) {
      throw new Error('Cannot access this content');
    }
    
    // Generate a new ID for the copy
    const copyId = crypto.randomUUID();
    const now = Date.now();
    
    // Create a copy record in the content_copies table
    await env.R3L_DB.prepare(`
      INSERT INTO content_copies (id, original_content_id, user_id, created_at, is_public)
      VALUES (?, ?, ?, ?, ?)
    `).bind(copyId, contentId, userId, now, isPublic ? 1 : 0).run();
    
    // Also create a content record for the copy, referencing the same file
    await env.R3L_DB.prepare(`
      INSERT INTO content (
        id, user_id, title, description, type, category, tags,
        file_key, is_public, created_at, updated_at, 
        archive_status, community_archive_eligible
      )
      SELECT ?, ?, title, description, type, category, tags,
        file_key, ?, ?, ?, 'personal', 0
      FROM content
      WHERE id = ?
    `).bind(
      copyId, 
      userId, 
      isPublic ? 1 : 0, 
      now, 
      now, 
      contentId
    ).run();
    
    // Count this as an archive vote for the original content
    await this.recordDownload(contentId, userId, env);
    
    return copyId;
  }
  
  /**
   * Get a random communique/user
   * @param env Environment bindings
   * @returns A random public content item
   */
  async getRandomCommunique(env: Env): Promise<ContentItem | null> {
    // Get a random public communique
    const content = await env.R3L_DB.prepare(`
      SELECT * FROM content
      WHERE is_public = 1
      ORDER BY RANDOM()
      LIMIT 1
    `).first<ContentItem>();
    
    return content || null;
  }
  
  /**
   * Update system stats for archive threshold calculations
   * @param env Environment bindings
   */
  async updateSystemStats(env: Env): Promise<void> {
    // Count total active content
    const activeContent = await env.R3L_DB.prepare(`
      SELECT COUNT(*) as count FROM content
      WHERE archive_status = 'active'
    `).first<{count: number}>();
    
    if (activeContent) {
      await env.R3L_DB.prepare(`
        UPDATE system_stats
        SET total_active_content = ?,
            last_updated = ?
        WHERE id = 'global_stats'
      `).bind(activeContent.count, Date.now()).run();
    }
  }
  
  /**
   * Get content location
   * @param contentId Content ID
   * @param env Environment bindings
   * @returns Location data or null
   */
  async getContentLocation(contentId: string, env: Env): Promise<{
    lat: number;
    lng: number;
    location_name?: string;
  } | null> {
    const location = await env.R3L_DB.prepare(`
      SELECT lat, lng, location_name
      FROM content_location
      WHERE content_id = ?
    `).bind(contentId).first<{
      lat: number;
      lng: number;
      location_name?: string;
    }>();
    
    return location || null;
  }
}
