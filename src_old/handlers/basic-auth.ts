import { Env } from '../types/env.js';
import { UserHandler } from './user.js';
import * as bcrypt from 'bcryptjs';

interface BasicAuthSession {
  id: string;
  user_id: string;
  token: string;
  created_at: number;
  expires_at: number;
  user_agent?: string;
  ip_address?: string;
}

export class BasicAuthHandler {
  private userHandler: UserHandler;

  constructor() {
    this.userHandler = new UserHandler();
  }

  /**
   * Register a new user with email and password
   */
  async registerUser(
    email: string,
    password: string,
    displayName: string,
    env: Env
  ): Promise<string> {
    // Check if user with this email already exists
    const existingUser = await this.getUserByEmail(email, env);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a username from the email
    const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);

    // Create the user in the database
    const res = await env.R3L_DB.prepare(
      `
      INSERT INTO users (id, username, display_name, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        crypto.randomUUID(),
        username,
        displayName,
        email,
        hashedPassword,
        Date.now(),
        Date.now()
      )
      .run();

    if (!res || !(res as any).success) {
      throw new Error('Failed to create user');
    }

    const lastId = String((res as any).meta?.last_row_id || '');
    return lastId;
  }

  /**
   * Login user with email and password
   */
  async loginUser(
    email: string,
    password: string,
    userAgent: string,
    ipAddress: string,
    env: Env
  ): Promise<{ sessionId: string; token: string; userId: string }> {
    // Get user by email
    const user = await this.getUserByEmail(email, env);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Create auth session
    const sessionId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await env.R3L_DB.prepare(
      `
      INSERT INTO auth_sessions (id, user_id, token, created_at, expires_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(sessionId, user.id, token, now, expiresAt, userAgent || null, ipAddress || null)
      .run();

    return {
      sessionId,
      token,
      userId: user.id,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string, env: Env): Promise<any> {
    return await env.R3L_DB.prepare(
      `
      SELECT * FROM users WHERE email = ?
    `
    )
      .bind(email)
      .first();
  }

  /**
   * Validate an authentication token
   */
  async validateToken(token: string, env: Env): Promise<string | null> {
    const now = Date.now();

    const session = await env.R3L_DB.prepare(
      `
      SELECT * FROM auth_sessions
      WHERE token = ? AND expires_at > ?
    `
    )
      .bind(token, now)
      .first<BasicAuthSession>();

    if (!session) {
      return null;
    }

    return session.user_id;
  }

  /**
   * Refresh an authentication session
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
      .first<BasicAuthSession>();

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
}
