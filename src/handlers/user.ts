import { Env } from '../types/env.js';
import { Sanitizer } from '../utils/sanitizer.js';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  lurkerModeRandomness: number;
  lurkerModeEnabled: boolean;
  defaultContentVisibility: 'public' | 'private';
  emailNotifications: boolean;
  showLocationByDefault: boolean;
  communique?: string;
  darkMode?: boolean;
  language?: string;
  timezone?: string;
  notificationsEnabled?: boolean;
  displayNameVisible?: boolean;
  locationVisible?: boolean;
  subtitle?: string;
  avatarStyle?: string;
  lastActive?: number;
  lurkerMode?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  created_at: number;
  updated_at: number;
  avatar_key?: string;
  avatar_url?: string;
  email?: string;
  preferences: UserPreferences;
}

export class UserHandler {
  /**
   * Create a new user
   * @param username Username
   * @param displayName Display name
   * @param orcidId ORCID identifier (if using ORCID auth)
   * @param env Environment bindings
   * @returns User ID of created user
   */
  async createUser(
    username: string,
    displayName: string,
    email: string | null,
    env: Env
  ): Promise<string> {
    // Check if username is available
    const existingUser = await env.R3L_DB.prepare(
      `
      SELECT id FROM users WHERE username = ?
    `
    )
      .bind(username)
      .first();

    if (existingUser) {
      throw new Error('Username already taken');
    }

    const userId = crypto.randomUUID();
    const now = Date.now();

    // Default preferences
    const defaultPreferences = {
      theme: 'system',
      lurkerModeRandomness: 50,
      lurkerModeEnabled: false,
      defaultContentVisibility: 'public',
      emailNotifications: true,
      showLocationByDefault: false,
      communique: '',
    };

    // Create user
    await env.R3L_DB.prepare(
      `
      INSERT INTO users (
        id, username, display_name, bio, created_at, updated_at,
        avatar_key, email, preferences
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        userId,
        username,
        displayName,
        '',
        now,
        now,
        null,
        email,
        JSON.stringify(defaultPreferences)
      )
      .run();

    return userId;
  }

  /**
   * Get a user by ID
   * @param userId User ID
   * @param env Environment bindings
   * @returns User profile or null if not found
   */
  async getUser(userId: string, env: Env): Promise<UserProfile | null> {
    const user = await env.R3L_DB.prepare(
      `
      SELECT * FROM users WHERE id = ?
    `
    )
      .bind(userId)
      .first<{
        id: string;
        username: string;
        display_name: string;
        bio: string;
        created_at: number;
        updated_at: number;
        orcid_id?: string;
        avatar_key?: string;
        preferences: string;
      }>();

    if (!user) {
      return null;
    }

    // Parse preferences JSON
    let preferences: UserPreferences;
    try {
      preferences = JSON.parse(user.preferences);

      // Ensure lurkerModeEnabled exists (for backward compatibility)
      if (preferences.lurkerModeEnabled === undefined) {
        preferences.lurkerModeEnabled = false;
      }
    } catch (error) {
      // Fallback to defaults if preferences are corrupted
      preferences = {
        theme: 'system',
        lurkerModeRandomness: 50,
        lurkerModeEnabled: false,
        defaultContentVisibility: 'public',
        emailNotifications: true,
        showLocationByDefault: false,
      };
    }

    return {
      ...user,
      preferences,
    };
  }

  /**
   * Get a user by username
   * @param username Username
   * @param env Environment bindings
   * @returns User profile or null if not found
   */
  async getUserByUsername(username: string, env: Env): Promise<UserProfile | null> {
    const user = await env.R3L_DB.prepare(
      `
      SELECT * FROM users WHERE username = ?
    `
    )
      .bind(username)
      .first<{
        id: string;
        username: string;
        display_name: string;
        bio: string;
        created_at: number;
        updated_at: number;
        orcid_id?: string;
        avatar_key?: string;
        preferences: string;
      }>();

    if (!user) {
      return null;
    }

    // Parse preferences JSON
    let preferences: UserPreferences;
    try {
      preferences = JSON.parse(user.preferences);

      // Ensure lurkerModeEnabled exists (for backward compatibility)
      if (preferences.lurkerModeEnabled === undefined) {
        preferences.lurkerModeEnabled = false;
      }
    } catch (error) {
      // Fallback to defaults if preferences are corrupted
      preferences = {
        theme: 'system',
        lurkerModeRandomness: 50,
        lurkerModeEnabled: false,
        defaultContentVisibility: 'public',
        emailNotifications: true,
        showLocationByDefault: false,
      };
    }

    return {
      ...user,
      preferences,
    };
  }

  /**
   * Update a user's profile
   * @param userId User ID
   * @param updates Profile updates
   * @param env Environment bindings
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<{
      displayName: string;
      bio: string;
      avatarKey: string;
    }>,
    env: Env
  ): Promise<void> {
    const user = await this.getUser(userId, env);

    if (!user) {
      throw new Error('User not found');
    }

    const updateFields = [];
    const values = [];

    if (updates.displayName !== undefined) {
      updateFields.push('display_name = ?');
      values.push(updates.displayName);
    }

    if (updates.bio !== undefined) {
      updateFields.push('bio = ?');
      values.push(updates.bio);
    }

    if (updates.avatarKey !== undefined) {
      updateFields.push('avatar_key = ?');
      values.push(updates.avatarKey);
    }

    if (updateFields.length === 0) {
      // Nothing to update
      return;
    }

    // Add updated_at and user_id
    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(userId);

    await env.R3L_DB.prepare(
      `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `
    )
      .bind(...values)
      .run();
  }

  /**
   * Update user preferences
   * @param userId User ID
   * @param preferences Preference updates
   * @param env Environment bindings
   */
  /**
   * Sanitize HTML content for communiques
   * Allows a limited set of HTML tags and attributes that are safe
   * @param html Raw HTML input
   * @returns Sanitized HTML
   */
  private sanitizeHtml(html: string): string {
    if (!html) return '';

    // Use our comprehensive sanitizer for communiques
    return Sanitizer.sanitizeCommunique(html);
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
    env: Env
  ): Promise<void> {
    const user = await this.getUser(userId, env);

    if (!user) {
      throw new Error('User not found');
    }

    // Sanitize communique HTML if present
    if (preferences.communique !== undefined) {
      preferences.communique = this.sanitizeHtml(preferences.communique);
    }

    // Merge with existing preferences
    const updatedPreferences = {
      ...user.preferences,
      ...preferences,
    };

    // Validate lurkerModeRandomness
    if (updatedPreferences.lurkerModeRandomness !== undefined) {
      updatedPreferences.lurkerModeRandomness = Math.max(
        0,
        Math.min(100, updatedPreferences.lurkerModeRandomness)
      );
    }

    await env.R3L_DB.prepare(
      `
      UPDATE users
      SET preferences = ?, updated_at = ?
      WHERE id = ?
    `
    )
      .bind(JSON.stringify(updatedPreferences), Date.now(), userId)
      .run();
  }

  /**
   * Get a user by GitHub ID
   */
  async getUserByGitHub(githubId: string, env: Env): Promise<UserProfile | null> {
    const user = await env.R3L_DB.prepare(
      `
      SELECT * FROM users WHERE github_id = ?
    `
    )
      .bind(githubId)
      .first();

    if (!user) return null;

    const idStr = String((user as any).id);
    return this.getUser(idStr, env);
  }

  /**
   * Create a user using GitHub identifiers
   */
  async createUserWithGitHub(
    username: string,
    displayName: string,
    githubId: string,
    avatarUrl: string | null,
    email: string | null,
    env: Env
  ): Promise<string> {
    const userId = crypto.randomUUID();
    const now = Date.now();

    const defaultPreferences = {
      theme: 'system',
      lurkerModeRandomness: 50,
      lurkerModeEnabled: false,
      defaultContentVisibility: 'public',
      emailNotifications: true,
      showLocationByDefault: false,
      communique: '',
    };

    await env.R3L_DB.prepare(
      `
      INSERT INTO users (
        id, username, display_name, bio, created_at, updated_at,
        github_id, avatar_url, email, preferences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        userId,
        username,
        displayName,
        '',
        now,
        now,
        githubId,
        avatarUrl,
        email,
        JSON.stringify(defaultPreferences)
      )
      .run();

    return userId;
  }

  /**
   * Get a user by ORCID ID
   */
  async getUserByOrcid(orcidId: string, env: Env): Promise<UserProfile | null> {
    const user = await env.R3L_DB.prepare(
      `
      SELECT * FROM users WHERE orcid_id = ?
    `
    )
      .bind(orcidId)
      .first();

    if (!user) return null;

    const idStr = String((user as any).id);
    return this.getUser(idStr, env);
  }

  /**
   * Create a user using ORCID identifier
   */
  async createUserWithOrcid(
    username: string,
    displayName: string,
    orcidId: string,
    env: Env
  ): Promise<string> {
    const userId = crypto.randomUUID();
    const now = Date.now();

    const defaultPreferences = {
      theme: 'system',
      lurkerModeRandomness: 50,
      lurkerModeEnabled: false,
      defaultContentVisibility: 'public',
      emailNotifications: true,
      showLocationByDefault: false,
      communique: '',
    };

    await env.R3L_DB.prepare(
      `
      INSERT INTO users (
        id, username, display_name, bio, created_at, updated_at,
        orcid_id, preferences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        userId,
        username,
        displayName,
        '',
        now,
        now,
        orcidId,
        JSON.stringify(defaultPreferences)
      )
      .run();

    return userId;
  }

  /**
   * Get user content statistics
   * @param userId User ID
   * @param env Environment bindings
   * @returns Content statistics
   */
  async getUserStats(
    userId: string,
    env: Env
  ): Promise<{
    totalContent: number;
    publicContent: number;
    privateContent: number;
    archivedContent: number;
    drawerCount: number;
  }> {
    // Total content count
    const totalContent = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) as count FROM content WHERE user_id = ?
    `
    )
      .bind(userId)
      .first<{ count: number }>();

    // Public content count
    const publicContent = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) as count FROM content 
      WHERE user_id = ? AND is_public = 1
    `
    )
      .bind(userId)
      .first<{ count: number }>();

    // Private content count
    const privateContent = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) as count FROM content 
      WHERE user_id = ? AND is_public = 0
    `
    )
      .bind(userId)
      .first<{ count: number }>();

    // Archived content count
    const archivedContent = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) as count FROM content 
      WHERE user_id = ? AND archive_status != 'active'
    `
    )
      .bind(userId)
      .first<{ count: number }>();

    // Drawer count
    const drawerCount = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) as count FROM drawers WHERE user_id = ?
    `
    )
      .bind(userId)
      .first<{ count: number }>();

    return {
      totalContent: totalContent?.count || 0,
      publicContent: publicContent?.count || 0,
      privateContent: privateContent?.count || 0,
      archivedContent: archivedContent?.count || 0,
      drawerCount: drawerCount?.count || 0,
    };
  }

  /**
   * Get user notifications
   * @param userId User ID
   * @param limit Maximum number of notifications
   * @param offset Pagination offset
   * @param env Environment bindings
   * @returns Array of notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<any[]> {
    const result = await env.R3L_DB.prepare(
      `
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(userId, limit, offset)
      .all();

    return result.results || [];
  }

  /**
   * Mark notifications as read
   * @param userId User ID
   * @param notificationIds Array of notification IDs
   * @param env Environment bindings
   */
  async markNotificationsAsRead(
    userId: string,
    notificationIds: string[],
    env: Env
  ): Promise<void> {
    if (notificationIds.length === 0) {
      return;
    }

    // Update in batches of 100
    const batchSize = 100;
    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const batch = notificationIds.slice(i, i + batchSize);
      const placeholders = batch.map(() => '?').join(',');

      await env.R3L_DB.prepare(
        `
        UPDATE notifications
        SET read = 1
        WHERE id IN (${placeholders})
        AND user_id = ?
      `
      )
        .bind(...batch, userId)
        .run();
    }
  }
}
