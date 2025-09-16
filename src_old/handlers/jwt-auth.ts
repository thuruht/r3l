import { Env } from '../types/env.js';
import { UserHandler } from './user.js';
import {
  generateJWTAndSetCookie,
  verifyJWT,
  extractJWTFromRequest,
  testJWT,
} from '../jwt-helper.js';
import { isSecureRequest, createClearAuthCookies } from '../cookie-helper.js';

/**
 * Clean and self-contained JWTAuthHandler implementation.
 * Keep it minimal: router will call these methods and expect Response or small result objects.
 */

export class JWTAuthHandler {
  private userHandler: UserHandler;

  constructor() {
    this.userHandler = new UserHandler();
  }

  async login(username: string, password: string, request: Request, env: Env) {
    try {
      const user = await this.userHandler.getUserByUsername(username, env);
      if (!user) return { success: false, message: 'Invalid username or password' };

      const passwordValid = await this.verifyPassword(user.id, password, env);
      if (!passwordValid) return { success: false, message: 'Invalid username or password' };

      const { headers } = await generateJWTAndSetCookie(
        user.id,
        request,
        user.display_name,
        'user',
        env
      );
      return { success: true, userId: user.id, headers };
    } catch (err) {
      console.error('JWTAuthHandler.login error', err);
      return { success: false, message: 'Authentication failed' };
    }
  }

  async register(
    username: string,
    password: string,
    displayName: string,
    email: string | null,
    request: Request,
    env: Env
  ): Promise<{
    success: boolean;
    userId?: string;
    recoveryKey?: string;
    message?: string;
    headers?: Headers;
  }> {
    try {
      const existing = await this.userHandler.getUserByUsername(username, env);
      if (existing) return { success: false, message: 'Username already exists' };

      const passwordHash = await this.hashPassword(password);
      const recoveryKey = this.generateRecoveryKey();
      const recoveryKeyHash = await this.hashPassword(recoveryKey);

      const userId = await this.createUserWithRecovery(
        username,
        displayName,
        email,
        passwordHash,
        recoveryKeyHash,
        env
      );
      if (!userId) return { success: false, message: 'Failed to create user' };

      const { headers } = await generateJWTAndSetCookie(userId, request, displayName, 'user', env);
      return { success: true, userId, recoveryKey, headers };
    } catch (err) {
      console.error('JWTAuthHandler.register error', err);
      return { success: false, message: 'Registration failed' };
    }
  }

  async checkUsername(request: Request, env: Env): Promise<Response> {
    try {
      const body = (await request.json()) as { username?: string };
      const username = (body && body.username) || '';
      if (!username)
        return new Response(JSON.stringify({ exists: false, error: 'Username is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      const user = await this.userHandler.getUserByUsername(username, env);
      return new Response(JSON.stringify({ exists: !!user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('JWTAuthHandler.checkUsername error', err);
      return new Response(JSON.stringify({ exists: false, error: 'Failed to check username' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  async verifyRecoveryKey(request: Request, env: Env): Promise<Response> {
    try {
      const { username, recoveryKey } = (await request.json()) as {
        username?: string;
        recoveryKey?: string;
      };
      if (!username || !recoveryKey)
        return new Response(
          JSON.stringify({ valid: false, error: 'Username and recovery key are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      const user = await this.userHandler.getUserByUsername(username, env);
      if (!user)
        return new Response(JSON.stringify({ valid: false, error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });

      const credentials = await env.R3L_DB.prepare(
        'SELECT recovery_key_hash FROM user_credentials WHERE user_id = ?'
      )
        .bind(user.id)
        .first<{ recovery_key_hash: string }>();
      if (!credentials || !credentials.recovery_key_hash)
        return new Response(JSON.stringify({ valid: false, error: 'Recovery key not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });

      const valid = await this.verifyPasswordHash(recoveryKey, credentials.recovery_key_hash);
      if (!valid) {
        // optional: record failed attempt
        return new Response(JSON.stringify({ valid: false, error: 'Invalid recovery key' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const newRecoveryKey = this.generateRecoveryKey();
      return new Response(JSON.stringify({ valid: true, userId: user.id, newRecoveryKey }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('JWTAuthHandler.verifyRecoveryKey error', err);
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to verify recovery key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  async resetPassword(request: Request, env: Env): Promise<Response> {
    try {
      const { username, recoveryKey, newPassword, newRecoveryKey } = (await request.json()) as {
        username?: string;
        recoveryKey?: string;
        newPassword?: string;
        newRecoveryKey?: string;
      };
      if (!username || !recoveryKey || !newPassword || !newRecoveryKey)
        return new Response(JSON.stringify({ success: false, error: 'All fields are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      const user = await this.userHandler.getUserByUsername(username, env);
      if (!user)
        return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });

      const credentials = await env.R3L_DB.prepare(
        'SELECT recovery_key_hash FROM user_credentials WHERE user_id = ?'
      )
        .bind(user.id)
        .first<{ recovery_key_hash: string }>();
      if (!credentials || !credentials.recovery_key_hash)
        return new Response(JSON.stringify({ success: false, error: 'Recovery key not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });

      const isValid = await this.verifyPasswordHash(recoveryKey, credentials.recovery_key_hash);
      if (!isValid)
        return new Response(JSON.stringify({ success: false, error: 'Invalid recovery key' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });

      const newPasswordHash = await this.hashPassword(newPassword);
      const newRecoveryKeyHash = await this.hashPassword(newRecoveryKey);
      await env.R3L_DB.prepare(
        'UPDATE user_credentials SET password_hash = ?, recovery_key_hash = ?, updated_at = ? WHERE user_id = ?'
      )
        .bind(newPasswordHash, newRecoveryKeyHash, Date.now(), user.id)
        .run();

      const { headers } = await generateJWTAndSetCookie(
        user.id,
        request,
        user.display_name,
        'user',
        env
      );
      await env.R3L_DB.prepare(
        'INSERT INTO auth_log (user_id, action, success, ip_address, user_agent, timestamp) VALUES (?, "password_reset", 1, ?, ?, ?)'
      )
        .bind(
          user.id,
          request.headers.get('CF-Connecting-IP') || 'unknown',
          request.headers.get('User-Agent') || 'unknown',
          Date.now()
        )
        .run();

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (err) {
      console.error('JWTAuthHandler.resetPassword error', err);
      return new Response(JSON.stringify({ success: false, error: 'Failed to reset password' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  async generateNewRecoveryKey(request: Request, env: Env): Promise<Response> {
    try {
      const userId = await this.validateToken(request, env);
      if (!userId)
        return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      const user = await this.userHandler.getUser(userId, env);
      if (!user)
        return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });

      const newRecoveryKey = this.generateRecoveryKey();
      const newRecoveryKeyHash = await this.hashPassword(newRecoveryKey);
      await env.R3L_DB.prepare(
        'UPDATE user_credentials SET recovery_key_hash = ?, updated_at = ? WHERE user_id = ?'
      )
        .bind(newRecoveryKeyHash, Date.now(), userId)
        .run();
      await env.R3L_DB.prepare(
        'INSERT INTO auth_log (user_id, action, success, ip_address, user_agent, timestamp, details) VALUES (?, "recovery_key_generated", 1, ?, ?, ?, ?)'
      )
        .bind(
          userId,
          request.headers.get('CF-Connecting-IP') || 'unknown',
          request.headers.get('User-Agent') || 'unknown',
          Date.now(),
          JSON.stringify({ method: 'user_initiated' })
        )
        .run();
      return new Response(JSON.stringify({ success: true, recoveryKey: newRecoveryKey }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('JWTAuthHandler.generateNewRecoveryKey error', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate new recovery key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  async logout(request: Request, env: Env) {
    try {
      const url = new URL(request.url);
      const domain = url.hostname;
      const isSecure = isSecureRequest(request);
      const headers = createClearAuthCookies(domain, isSecure);
      return { success: true, headers };
    } catch (err) {
      console.error('JWTAuthHandler.logout error', err);
      return { success: true, headers: new Headers() };
    }
  }

  async validateToken(request: Request, env: Env): Promise<string | null> {
    try {
      const token = extractJWTFromRequest(request);
      if (!token) return null;
      const payload = await verifyJWT(token, env);
      if (!payload || !payload.sub) return null;
      const user = await this.userHandler.getUser(payload.sub, env);
      if (!user) return null;
      return payload.sub;
    } catch (err) {
      console.error('JWTAuthHandler.validateToken error', err);
      return null;
    }
  }

  async getProfile(request: Request, env: Env): Promise<Response> {
    try {
      const userId = await this.validateToken(request, env);
      if (!userId)
        return new Response(JSON.stringify({ error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      const user = await this.userHandler.getUser(userId, env);
      if (!user)
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('JWTAuthHandler.getProfile error', err);
      return new Response(JSON.stringify({ error: 'Failed to get profile' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  async handleTestJWT(request: Request, env: Env): Promise<Response> {
    return testJWT(request, env);
  }

  // --- Lightweight password/recovery helpers used by register/reset flows ---
  private async verifyPassword(userId: string, password: string, env: Env): Promise<boolean> {
    try {
      const row = await env.R3L_DB.prepare(
        'SELECT password_hash FROM user_credentials WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ password_hash: string }>();
      if (!row || !row.password_hash) return false;
      return this.verifyPasswordHash(password, row.password_hash);
    } catch (err) {
      console.error('verifyPassword error', err);
      return false;
    }
  }

  private async verifyPasswordHash(password: string, hash: string): Promise<boolean> {
    try {
      if (!hash.includes(':')) return false;
      const parts = hash.split(':');
      if (hash.startsWith('pbkdf2:')) {
        const iterations = parseInt(parts[1], 10);
        const salt = parts[2];
        const stored = parts[3];
        const encoder = new TextEncoder();
        const pw = encoder.encode(password + salt);
        let buffer = await crypto.subtle.digest('SHA-256', pw);
        for (let i = 0; i < iterations; i++) {
          buffer = await crypto.subtle.digest('SHA-256', new Uint8Array(buffer));
        }
        const hex = Array.from(new Uint8Array(buffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return hex === stored;
      }
      return false;
    } catch (err) {
      console.error('verifyPasswordHash error', err);
      return false;
    }
  }

  private generateRecoveryKey(): string {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const segments: string[] = [];
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        const idx = randomBytes[i * 4 + j] % charset.length;
        segment += charset[idx];
      }
      segments.push(segment);
    }
    return segments.join('-');
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(12));
      const saltHex = Array.from(salt)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const encoder = new TextEncoder();
      const data = encoder.encode(password + saltHex);
      let buffer = await crypto.subtle.digest('SHA-256', data);
      for (let i = 0; i < 500; i++) {
        buffer = await crypto.subtle.digest('SHA-256', new Uint8Array(buffer));
      }
      const hex = Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `pbkdf2:500:${saltHex}:${hex}`;
    } catch (err) {
      console.error('hashPassword error', err);
      return 'invalid-hash';
    }
  }

  private async createUserWithRecovery(
    username: string,
    displayName: string,
    email: string | null,
    passwordHash: string,
    recoveryKeyHash: string,
    env: Env
  ): Promise<string | null> {
    try {
      const userId = crypto.randomUUID();
      const credentialId = crypto.randomUUID();
      const now = Date.now();
      await env.R3L_DB.prepare(
        'INSERT INTO users (id, username, display_name, bio, created_at, updated_at, avatar_key, email, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "{}")'
      )
        .bind(userId, username, displayName, '', now, now, null, email)
        .run();
      await env.R3L_DB.prepare(
        'INSERT INTO user_credentials (id, user_id, username, password_hash, recovery_key_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(credentialId, userId, username, passwordHash, recoveryKeyHash, now, now)
        .run();
      return userId;
    } catch (err) {
      console.error('createUserWithRecovery error', err);
      return null;
    }
  }
}
