import { Env } from '../types/env';

interface DrawerItem {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  content_count?: number;
}

interface DrawerContentItem {
  id: string;
  drawer_id: string;
  content_id: string;
  added_at: number;
  note: string;
}

interface ContentDetails {
  id: string;
  title: string;
  type: string;
  created_at: number;
  user_id: string;
  // Other fields as needed
}

interface RandomDrawer {
  userId: string;
  username: string;
  subtitle?: string;
  communique?: string;
  connectionCount: number;
  recentFiles: {
    id: string;
    title: string;
    type: string;
    expiresIn?: number;
  }[];
}

export class DrawerHandler {
  /**
   * Create a new drawer for organizing content
   * @param userId User ID who owns the drawer
   * @param name Name of the drawer
   * @param description Description of the drawer
   * @param isPublic Whether the drawer is publicly viewable
   * @param env Environment bindings
   * @returns The created drawer ID
   */
  async createDrawer(
    userId: string,
    name: string,
    description: string,
    isPublic: boolean,
    env: Env
  ): Promise<string> {
    const drawerId = crypto.randomUUID();
    const now = Date.now();
    
    await env.R3L_DB.prepare(`
      INSERT INTO drawers (id, user_id, name, description, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      drawerId,
      userId,
      name,
      description,
      isPublic ? 1 : 0,
      now,
      now
    ).run();
    
    return drawerId;
  }
  
  /**
   * Get a drawer by ID
   * @param drawerId Drawer ID
   * @param env Environment bindings
   * @returns Drawer details
   */
  async getDrawer(drawerId: string, env: Env): Promise<DrawerItem | null> {
    const result = await env.R3L_DB.prepare(`
      SELECT d.*, COUNT(dc.id) as content_count
      FROM drawers d
      LEFT JOIN drawer_contents dc ON d.id = dc.drawer_id
      WHERE d.id = ?
      GROUP BY d.id
    `).bind(drawerId).first<DrawerItem>();
    
    return result || null;
  }
  
  /**
   * Get drawer by user ID
   * @param userId User ID
   * @param env Environment bindings
   * @returns Drawer details for that user ID
   */
  async getDrawerById(userId: string, env: Env): Promise<any> {
    try {
      // Get user profile
      const userResult = await env.R3L_DB.prepare(`
        SELECT id, username, display_name, preferences
        FROM users
        WHERE id = ?
      `).bind(userId).first<{
        id: string;
        username: string;
        display_name: string;
        preferences: string;
      }>();
      
      if (!userResult) {
        throw new Error('User not found');
      }
      
      // Parse preferences
      let preferences = {};
      try {
        preferences = JSON.parse(userResult.preferences || '{}');
      } catch (e) {
        console.error('Error parsing user preferences:', e);
      }
      
      // Get connection count
      const connectionsResult = await env.R3L_DB.prepare(`
        SELECT COUNT(*) as count
        FROM user_connections
        WHERE (user_id_a = ? OR user_id_b = ?) AND status = 'accepted'
      `).bind(userId, userId).first<{ count: number }>();
      
      // Get recent public files
      const filesResult = await env.R3L_DB.prepare(`
        SELECT id, title, type, expires_at
        FROM content
        WHERE user_id = ? AND is_public = 1 AND is_archived = 0
        ORDER BY created_at DESC
        LIMIT 6
      `).bind(userId).all<{
        id: string;
        title: string;
        type: string;
        expires_at: number | null;
      }>();
      
      // Format the response
      return {
        userId: userResult.id,
        username: userResult.username,
        displayName: userResult.display_name,
        subtitle: (preferences as any).subtitle || '',
        communique: (preferences as any).communique || '',
        connectionCount: connectionsResult?.count || 0,
        recentFiles: (filesResult.results || []).map(file => ({
          id: file.id,
          title: file.title,
          type: file.type,
          expiresIn: file.expires_at ? Math.ceil((file.expires_at - Date.now()) / (1000 * 60 * 60 * 24)) : undefined
        }))
      };
    } catch (error) {
      console.error('Error fetching drawer by user ID:', error);
      throw error;
    }
  }
  
  /**
   * Get a random drawer
   * @param env Environment bindings
   * @returns Random drawer data
   */
  async getRandomDrawer(env: Env): Promise<RandomDrawer> {
    try {
      // Get a random user who has public content and isn't in lurker mode
      const userResult = await env.R3L_DB.prepare(`
        SELECT u.id, u.username, u.display_name, u.preferences
        FROM users u
        JOIN content c ON u.id = c.user_id
        WHERE c.is_public = 1 
        AND (JSON_EXTRACT(u.preferences, '$.lurker_mode') IS NULL
        OR JSON_EXTRACT(u.preferences, '$.lurker_mode') = 0)
        GROUP BY u.id
        ORDER BY RANDOM()
        LIMIT 1
      `).first<{
        id: string;
        username: string;
        display_name: string;
        preferences: string;
      }>();
      
      if (!userResult) {
        throw new Error('No users with public content found');
      }
      
      // Parse preferences
      let preferences = {};
      try {
        preferences = JSON.parse(userResult.preferences || '{}');
      } catch (e) {
        console.error('Error parsing user preferences:', e);
      }
      
      // Get connection count
      const connectionsResult = await env.R3L_DB.prepare(`
        SELECT COUNT(*) as count
        FROM user_connections
        WHERE (user_id_a = ? OR user_id_b = ?) AND status = 'accepted'
      `).bind(userResult.id, userResult.id).first<{ count: number }>();
      
      // Get recent public files
      const filesResult = await env.R3L_DB.prepare(`
        SELECT id, title, type, expires_at
        FROM content
        WHERE user_id = ? AND is_public = 1 AND is_archived = 0
        ORDER BY created_at DESC
        LIMIT 5
      `).bind(userResult.id).all<{
        id: string;
        title: string;
        type: string;
        expires_at: number | null;
      }>();
      
      return {
        userId: userResult.id,
        username: userResult.display_name || userResult.username,
        subtitle: (preferences as any).subtitle || 'User\'s Communique',
        communique: (preferences as any).communique || '',
        connectionCount: connectionsResult?.count || 0,
        recentFiles: (filesResult.results || []).map(file => ({
          id: file.id,
          title: file.title,
          type: file.type,
          expiresIn: file.expires_at ? Math.ceil((file.expires_at - Date.now()) / (1000 * 60 * 60 * 24)) : undefined
        }))
      };
    } catch (error) {
      console.error('Error fetching random drawer:', error);
      throw error;
    }
  }
  
  /**
   * Update a drawer's details
   * @param drawerId Drawer ID
   * @param updates Object with fields to update
   * @param env Environment bindings
   */
  async updateDrawer(
    drawerId: string,
    updates: { name?: string; description?: string; isPublic?: boolean },
    env: Env
  ): Promise<void> {
    const drawer = await this.getDrawer(drawerId, env);
    if (!drawer) {
      throw new Error('Drawer not found');
    }
    
    const { name, description, isPublic } = updates;
    const updateFields = [];
    const values = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }
    
    if (isPublic !== undefined) {
      updateFields.push('is_public = ?');
      values.push(isPublic ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      // Nothing to update
      return;
    }
    
    // Add updated_at and drawer_id
    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(drawerId);
    
    await env.R3L_DB.prepare(`
      UPDATE drawers
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
  }
  
  /**
   * Delete a drawer
   * @param drawerId Drawer ID
   * @param userId User ID (for authorization)
   * @param env Environment bindings
   */
  async deleteDrawer(drawerId: string, userId: string, env: Env): Promise<void> {
    const drawer = await this.getDrawer(drawerId, env);
    if (!drawer) {
      throw new Error('Drawer not found');
    }
    
    // Check ownership
    if (drawer.user_id !== userId) {
      throw new Error('Unauthorized to delete this drawer');
    }
    
    // Delete drawer and its contents (cascade should handle the contents)
    await env.R3L_DB.prepare(`
      DELETE FROM drawers WHERE id = ?
    `).bind(drawerId).run();
  }
  
  /**
   * Get all drawers for a user
   * @param userId User ID
   * @param env Environment bindings
   * @returns Array of drawer objects
   */
  async getUserDrawers(userId: string, env: Env): Promise<DrawerItem[]> {
    const result = await env.R3L_DB.prepare(`
      SELECT d.*, COUNT(dc.id) as content_count
      FROM drawers d
      LEFT JOIN drawer_contents dc ON d.id = dc.drawer_id
      WHERE d.user_id = ?
      GROUP BY d.id
      ORDER BY d.updated_at DESC
    `).bind(userId).all<DrawerItem>();
    
    return result.results || [];
  }
  
  /**
   * Get public drawers
   * @param limit Number of drawers to return
   * @param offset Pagination offset
   * @param env Environment bindings
   * @returns Array of public drawer objects
   */
  async getPublicDrawers(limit: number = 20, offset: number = 0, env: Env): Promise<DrawerItem[]> {
    const result = await env.R3L_DB.prepare(`
      SELECT d.*, COUNT(dc.id) as content_count
      FROM drawers d
      LEFT JOIN drawer_contents dc ON d.id = dc.drawer_id
      WHERE d.is_public = 1
      GROUP BY d.id
      ORDER BY d.updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all<DrawerItem>();
    
    return result.results || [];
  }
  
  /**
   * Add content to a drawer
   * @param drawerId Drawer ID
   * @param contentId Content ID
   * @param note Optional note about this content
   * @param userId User ID (for authorization)
   * @param env Environment bindings
   * @returns ID of the drawer content entry
   */
  async addContentToDrawer(
    drawerId: string,
    contentId: string,
    note: string,
    userId: string,
    env: Env
  ): Promise<string> {
    const drawer = await this.getDrawer(drawerId, env);
    if (!drawer) {
      throw new Error('Drawer not found');
    }
    
    // Check ownership
    if (drawer.user_id !== userId) {
      throw new Error('Unauthorized to modify this drawer');
    }
    
    // Check if content already in drawer
    const existing = await env.R3L_DB.prepare(`
      SELECT id FROM drawer_contents
      WHERE drawer_id = ? AND content_id = ?
    `).bind(drawerId, contentId).first();
    
    if (existing) {
      throw new Error('Content already in drawer');
    }
    
    const drawerContentId = crypto.randomUUID();
    
    await env.R3L_DB.prepare(`
      INSERT INTO drawer_contents (id, drawer_id, content_id, added_at, note)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      drawerContentId,
      drawerId,
      contentId,
      Date.now(),
      note || ''
    ).run();
    
    // Update drawer's updated_at timestamp
    await env.R3L_DB.prepare(`
      UPDATE drawers SET updated_at = ? WHERE id = ?
    `).bind(Date.now(), drawerId).run();
    
    return drawerContentId;
  }
  
  /**
   * Remove content from a drawer
   * @param drawerId Drawer ID
   * @param contentId Content ID
   * @param userId User ID (for authorization)
   * @param env Environment bindings
   */
  async removeContentFromDrawer(
    drawerId: string,
    contentId: string,
    userId: string,
    env: Env
  ): Promise<void> {
    const drawer = await this.getDrawer(drawerId, env);
    if (!drawer) {
      throw new Error('Drawer not found');
    }
    
    // Check ownership
    if (drawer.user_id !== userId) {
      throw new Error('Unauthorized to modify this drawer');
    }
    
    await env.R3L_DB.prepare(`
      DELETE FROM drawer_contents
      WHERE drawer_id = ? AND content_id = ?
    `).bind(drawerId, contentId).run();
    
    // Update drawer's updated_at timestamp
    await env.R3L_DB.prepare(`
      UPDATE drawers SET updated_at = ? WHERE id = ?
    `).bind(Date.now(), drawerId).run();
  }
  
  /**
   * Get all content in a drawer
   * @param drawerId Drawer ID
   * @param env Environment bindings
   * @returns Array of content items with drawer metadata
   */
  async getDrawerContents(drawerId: string, env: Env): Promise<(DrawerContentItem & ContentDetails)[]> {
    const drawer = await this.getDrawer(drawerId, env);
    if (!drawer) {
      throw new Error('Drawer not found');
    }
    
    // If drawer is not public, only the owner should access it
    // (caller should check this)
    
    const result = await env.R3L_DB.prepare(`
      SELECT dc.*, c.title, c.type, c.created_at, c.user_id
      FROM drawer_contents dc
      JOIN content c ON dc.content_id = c.id
      WHERE dc.drawer_id = ?
      ORDER BY dc.added_at DESC
    `).bind(drawerId).all<DrawerContentItem & ContentDetails>();
    
    return result.results || [];
  }
  
  /**
   * Update note for a drawer content item
   * @param drawerContentId Drawer content entry ID
   * @param note New note
   * @param userId User ID (for authorization)
   * @param env Environment bindings
   */
  async updateDrawerContentNote(
    drawerContentId: string,
    note: string,
    userId: string,
    env: Env
  ): Promise<void> {
    // Get drawer content
    const drawerContent = await env.R3L_DB.prepare(`
      SELECT dc.*, d.user_id as drawer_owner_id
      FROM drawer_contents dc
      JOIN drawers d ON dc.drawer_id = d.id
      WHERE dc.id = ?
    `).bind(drawerContentId).first<DrawerContentItem & { drawer_owner_id: string }>();
    
    if (!drawerContent) {
      throw new Error('Drawer content not found');
    }
    
    // Check ownership
    if (drawerContent.drawer_owner_id !== userId) {
      throw new Error('Unauthorized to modify this drawer content');
    }
    
    await env.R3L_DB.prepare(`
      UPDATE drawer_contents
      SET note = ?
      WHERE id = ?
    `).bind(note, drawerContentId).run();
    
    // Update drawer's updated_at timestamp
    await env.R3L_DB.prepare(`
      UPDATE drawers SET updated_at = ? WHERE id = ?
    `).bind(Date.now(), drawerContent.drawer_id).run();
  }
  
  /**
   * Find all drawers containing a specific content
   * @param contentId Content ID
   * @param includePrivate Whether to include private drawers
   * @param userId Optional user ID to check private drawers
   * @param env Environment bindings
   * @returns Array of drawers containing the content
   */
  async findDrawersWithContent(
    contentId: string,
    includePrivate: boolean,
    env: Env,
    userId?: string
  ): Promise<DrawerItem[]> {
    let query = `
      SELECT d.*, COUNT(dc2.id) as content_count
      FROM drawers d
      JOIN drawer_contents dc ON d.id = dc.drawer_id
      LEFT JOIN drawer_contents dc2 ON d.id = dc2.drawer_id
      WHERE dc.content_id = ?
    `;
    
    const params = [contentId];
    
    if (!includePrivate) {
      query += ' AND d.is_public = 1';
    } else if (userId) {
      query += ' AND (d.is_public = 1 OR d.user_id = ?)';
      params.push(userId);
    } else {
      query += ' AND d.is_public = 1';
    }
    
    query += ' GROUP BY d.id';
    
    const result = await env.R3L_DB.prepare(query).bind(...params).all<DrawerItem>();
    return result.results || [];
  }
}
