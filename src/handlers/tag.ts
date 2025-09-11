import { Env } from '../types/env.js';

interface TagRecord {
  tag: string;
  count: number;
}

export class TagHandler {
  /**
   * Add tags to a content item
   * @param contentId Content ID
   * @param tags Array of tags to add
   * @param env Environment bindings
   */
  async addTags(contentId: string, tags: string[], env: Env): Promise<void> {
    if (!tags || tags.length === 0) return;

    // Sanitize and normalize tags
    const normalizedTags = this.normalizeTags(tags);
    if (normalizedTags.length === 0) return;

    // Get current tags
    const content = await env.R3L_DB.prepare(
      `
      SELECT tags FROM content WHERE id = ?
    `
    )
      .bind(contentId)
      .first<{ tags: string | null }>();

    if (!content) {
      throw new Error('Content not found');
    }

    // Parse existing tags or initialize empty array
    const existingTags = content.tags ? JSON.parse(content.tags) : [];

    // Merge and deduplicate tags
    const mergedTags = Array.from(new Set([...existingTags, ...normalizedTags]));

    // Update tags in content table
    await env.R3L_DB.prepare(
      `
      UPDATE content SET tags = ? WHERE id = ?
    `
    )
      .bind(JSON.stringify(mergedTags), contentId)
      .run();

    // Track tag usage for each tag
    for (const tag of normalizedTags) {
      // Check if tag exists in tag_usage table
      const tagExists = await env.R3L_DB.prepare(
        `
        SELECT count FROM tag_usage WHERE tag = ?
      `
      )
        .bind(tag)
        .first<{ count: number }>();

      if (tagExists) {
        // Increment count
        await env.R3L_DB.prepare(
          `
          UPDATE tag_usage SET count = count + 1 WHERE tag = ?
        `
        )
          .bind(tag)
          .run();
      } else {
        // Insert new tag
        await env.R3L_DB.prepare(
          `
          INSERT INTO tag_usage (tag, count) VALUES (?, 1)
        `
        )
          .bind(tag)
          .run();
      }
    }
  }

  /**
   * Remove tags from a content item
   * @param contentId Content ID
   * @param tags Array of tags to remove
   * @param env Environment bindings
   */
  async removeTags(contentId: string, tags: string[], env: Env): Promise<void> {
    if (!tags || tags.length === 0) return;

    // Sanitize and normalize tags
    const normalizedTags = this.normalizeTags(tags);
    if (normalizedTags.length === 0) return;

    // Get current tags
    const content = await env.R3L_DB.prepare(
      `
      SELECT tags FROM content WHERE id = ?
    `
    )
      .bind(contentId)
      .first<{ tags: string | null }>();

    if (!content || !content.tags) return;

    // Parse existing tags
    const existingTags = JSON.parse(content.tags);

    // Filter out tags to remove
    const updatedTags = existingTags.filter((tag: string) => !normalizedTags.includes(tag));

    // Update tags in content table
    await env.R3L_DB.prepare(
      `
      UPDATE content SET tags = ? WHERE id = ?
    `
    )
      .bind(JSON.stringify(updatedTags), contentId)
      .run();

    // Update tag usage count
    for (const tag of normalizedTags) {
      await env.R3L_DB.prepare(
        `
        UPDATE tag_usage SET count = GREATEST(0, count - 1) WHERE tag = ?
      `
      )
        .bind(tag)
        .run();
    }
  }

  /**
   * Get popular tags
   * @param limit Maximum number of tags to return
   * @param env Environment bindings
   * @returns Array of popular tags with counts
   */
  async getPopularTags(limit: number = 30, env: Env): Promise<TagRecord[]> {
    const result = await env.R3L_DB.prepare(
      `
      SELECT tag, count FROM tag_usage
      WHERE count > 0
      ORDER BY count DESC
      LIMIT ?
    `
    )
      .bind(limit)
      .all<TagRecord>();

    return result.results || [];
  }

  /**
   * Get tags for a content item
   * @param contentId Content ID
   * @param env Environment bindings
   * @returns Array of tags
   */
  async getContentTags(contentId: string, env: Env): Promise<string[]> {
    const content = await env.R3L_DB.prepare(
      `
      SELECT tags FROM content WHERE id = ?
    `
    )
      .bind(contentId)
      .first<{ tags: string | null }>();

    if (!content || !content.tags) return [];

    return JSON.parse(content.tags);
  }

  /**
   * Find content by tag
   * @param tag Tag to search for
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @param env Environment bindings
   * @returns Array of content IDs matching the tag
   */
  async findContentByTag(
    tag: string,
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<string[]> {
    // Normalize tag
    const normalizedTag = this.normalizeTags([tag])[0];
    if (!normalizedTag) return [];

    // Find content with this tag
    // Note: This is inefficient with JSON storage - a relational approach would be better
    // but we're working with the existing schema
    const results = await env.R3L_DB.prepare(
      `
      SELECT id FROM content
      WHERE tags LIKE ?
      LIMIT ? OFFSET ?
    `
    )
      .bind(`%${normalizedTag}%`, limit, offset)
      .all<{ id: string }>();

    return (results.results || []).map(row => row.id);
  }

  /**
   * Search for tags by name, with usage counts.
   * @param query The search query for tag names.
   * @param limit The maximum number of tags to return.
   * @param userId The optional ID of the authenticated user to include private content counts.
   * @param env Environment bindings.
   * @returns An array of tags with their usage counts.
   */
  async searchTags(query: string, limit: number, userId: string | null, env: Env): Promise<any[]> {
    let sql = `
      SELECT
        t.id,
        t.name,
        COUNT(ct.content_id) as count
      FROM tags t
      LEFT JOIN content_tags ct ON t.id = ct.tag_id
    `;

    const params: (string | number)[] = [];

    // If a user is provided, we need to join with content to check for visibility
    if (userId) {
      sql += `
        LEFT JOIN content c ON ct.content_id = c.id
      `;
    }

    let whereClauses: string[] = [];

    // If there's a search query
    if (query) {
      whereClauses.push(`t.name LIKE ?`);
      params.push(`%${query}%`);
    }

    // If not authenticated, only count public content
    if (!userId) {
      whereClauses.push(`(ct.content_id IS NULL OR EXISTS (SELECT 1 FROM content c WHERE c.id = ct.content_id AND c.is_public = 1))`);
    } else {
      // If authenticated, count public content OR private content owned by the user
      whereClauses.push(`(ct.content_id IS NULL OR EXISTS (SELECT 1 FROM content c WHERE c.id = ct.content_id AND (c.is_public = 1 OR c.user_id = ?)))`);
      params.push(userId);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Group by tag and sort by usage count
    sql += `
      GROUP BY t.id, t.name
      ORDER BY count DESC, t.name ASC
      LIMIT ?
    `;

    params.push(limit);

    const result = await env.R3L_DB.prepare(sql)
      .bind(...params)
      .all();

    return result.results || [];
  }

  /**
   * Normalize tags - clean, lowercase, and deduplicate
   * @param tags Array of tags to normalize
   * @returns Normalized array of tags
   */
  private normalizeTags(tags: string[]): string[] {
    return [
      ...new Set(
        tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length <= 30)
          // Replace spaces with hyphens for multi-word tags
          .map(tag => tag.replace(/\s+/g, '-'))
          // Remove special characters except hyphens and alphanumerics
          .map(tag => tag.replace(/[^a-z0-9-]/g, ''))
      ),
    ];
  }
}
