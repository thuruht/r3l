import { Env } from '../types/env.js';
import { UserHandler } from './user.js';

interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  created_at: number;
  expires_at: number;
  user_agent?: string;
  ip_address?: string;
}

export class AuthHandler {
  private userHandler: UserHandler;

  constructor() {
    this.userHandler = new UserHandler();
  }

  /**
   * Validate an authentication token
   * @param token Authentication token
   * @param env Environment bindings
   * @returns User ID if valid, null otherwise
   */
  async validateToken(token: string, env: Env): Promise<string | null> {
    console.log('AuthHandler - validateToken called, token length:', token.length);
    const now = Date.now();

    try {
      const session = await env.R3L_DB.prepare(
        `
        SELECT * FROM auth_sessions
        WHERE token = ? AND expires_at > ?
      `
      )
        .bind(token, now)
        .first<AuthSession>();

      if (!session) {
        console.log('AuthHandler - validateToken: No valid session found');
        return null;
      }

      console.log('AuthHandler - validateToken: Valid session found for user:', session.user_id);
      return session.user_id;
    } catch (error) {
      console.error('AuthHandler - validateToken error:', error);
      return null;
    }
  }

  /**
   * Refresh an authentication session
   * @param token Authentication token
   * @param env Environment bindings
   * @returns New expiration time if successful, null otherwise
   */
  async refreshSession(token: string, env: Env): Promise<number | null> {
    const now = Date.now();

    const session = await env.R3L_DB.prepare(
      `
      SELECT * FROM auth_sessions
      WHERE token = ? AND expires_at > ?
    `
    )
      .bind(token, now)
      .first<AuthSession>();

    if (!session) {
      return null;
    }

    const newExpiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await env.R3L_DB.prepare(
      `
      UPDATE auth_sessions
      SET expires_at = ?
      WHERE token = ?
    `
    )
      .bind(newExpiresAt, token)
      .run();

    return newExpiresAt;
  }

  /**
   * End an authentication session (logout)
   * @param token Authentication token
   * @param env Environment bindings
   */
  async endSession(token: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(
      `
      DELETE FROM auth_sessions
      WHERE token = ?
    `
    )
      .bind(token)
      .run();
  }

  /**
   * End all sessions for a user
   * @param userId User ID
   * @param env Environment bindings
   */
  async endAllSessions(userId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(
      `
      DELETE FROM auth_sessions
      WHERE user_id = ?
    `
    )
      .bind(userId)
      .run();
  }

  /**
   * Get all active sessions for a user
   * @param userId User ID
   * @param env Environment bindings
   * @returns Array of active sessions
   */
  async getUserSessions(userId: string, env: Env): Promise<AuthSession[]> {
    const now = Date.now();

    const result = await env.R3L_DB.prepare(
      `
      SELECT * FROM auth_sessions
      WHERE user_id = ? AND expires_at > ?
      ORDER BY created_at DESC
    `
    )
      .bind(userId, now)
      .all<AuthSession>();

    return result.results || [];
  }
}