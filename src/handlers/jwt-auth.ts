
      await env.R3L_DB.prepare(
        `
        UPDATE user_credentials
        SET password_hash = ?, recovery_key_hash = ?, updated_at = ?
        WHERE user_id = ?
      `
      )
        .bind(newPasswordHash, newRecoveryKeyHash, Date.now(), user.id)
        .run();

      const { headers, token } = await generateJWTAndSetCookie(
        user.id,
        request,
        user.display_name,
        'user',
        env
      );

      await env.R3L_DB.prepare(
        `
        INSERT INTO auth_log (
          user_id, action, success, ip_address, user_agent, timestamp
        )
        VALUES (?, 'password_reset', 1, ?, ?, ?)
      `
      )
        .bind(
          user.id,
          request.headers.get('CF-Connecting-IP') || 'unknown',
          request.headers.get('User-Agent') || 'unknown',
          Date.now()
        )
        .run();

      return new Response(
        JSON.stringify({
          success: true,
        }),
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error('JWTAuth - Reset password error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to reset password',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  async generateNewRecoveryKey(request: Request, env: Env): Promise<Response> {
    try {
      const userId = await this.validateToken(request, env);

      if (!userId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Not authenticated',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const user = await this.userHandler.getUser(userId, env);

      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User not found',
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const newRecoveryKey = this.generateRecoveryKey();
      const newRecoveryKeyHash = await this.hashPassword(newRecoveryKey);

      await env.R3L_DB.prepare(
        `
        UPDATE user_credentials
        SET recovery_key_hash = ?, updated_at = ?
        WHERE user_id = ?
      `
      )
        .bind(newRecoveryKeyHash, Date.now(), userId)
        .run();

      await env.R3L_DB.prepare(
        `
        INSERT INTO auth_log (
          user_id, action, success, ip_address, user_agent, timestamp, details
        )
        VALUES (?, 'recovery_key_generated', 1, ?, ?, ?, ?)
      `
      )
        .bind(
          userId,
          request.headers.get('CF-Connecting-IP') || 'unknown',
          request.headers.get('User-Agent') || 'unknown',
          Date.now(),
          JSON.stringify({ method: 'user_initiated' })
        )
        .run();

      return new Response(
        JSON.stringify({
          success: true,
          recoveryKey: newRecoveryKey,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('JWTAuth - Generate new recovery key error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to generate new recovery key',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  async handleTestJWT(request: Request, env: Env): Promise<Response> {
    return testJWT(request, env);
  }

  private async verifyPassword(userId: string, password: string, env: Env): Promise<boolean> {
    try {
      const result = await env.R3L_DB.prepare(
        `
        SELECT password_hash FROM user_credentials
        WHERE user_id = ?
      `
      )
        .bind(userId)
        .first<{ password_hash: string }>();

      if (!result || !result.password_hash) {
        return false;
      }

      return await this.verifyPasswordHash(password, result.password_hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  private generateRecoveryKey(): string {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);

    const segments = [];
    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 5; j++) {
        const randomIndex = randomBytes[i * 4 + j] % charset.length;
        segment += charset[randomIndex];
      }
      segments.push(segment);
    }

    return segments.join('-');
  }

  private async createUserWithRecovery(
    username: string,
    displayName: string,
    email: string,
    passwordHash: string,
    recoveryKeyHash: string,
    env: Env
  ): Promise<string | null> {
    try {
      const userId = crypto.randomUUID();
      const credentialId = crypto.randomUUID();
      const now = Date.now();

      await env.R3L_DB.prepare(
        `
        INSERT INTO users (
          id, username, display_name, email, 
          created_at, updated_at, preferences
        )
        VALUES (?, ?, ?, ?, ?, ?, '{}')
      `
      )
        .bind(userId, username, displayName, email, now, now)
        .run();

      await env.R3L_DB.prepare(
        `
        INSERT INTO user_credentials (
          id, user_id, username, password_hash, recovery_key_hash, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(credentialId, userId, username, passwordHash, recoveryKeyHash, now, now)
        .run();

      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(salt)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const encoder = new TextEncoder();
      const passwordWithSalt = encoder.encode(password + saltHex);

      let hashBuffer = await crypto.subtle.digest('SHA-256', passwordWithSalt);

      for (let i = 0; i < 10000; i++) {
        const hashArray = new Uint8Array(hashBuffer);
        hashBuffer = await crypto.subtle.digest('SHA-256', hashArray);
      }

      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return `pbkdf2:10000:${saltHex}:${hashHex}`;
    } catch (error) {
      console.error('Error hashing password:', error);
      return 'invalid-hash';
    }
  }

  private async verifyPasswordHash(password: string, hash: string): Promise<boolean> {
    try {
      if (!hash.includes(':')) {
        return false;
      }

      const parts = hash.split(':');

      if (hash.startsWith('pbkdf2:')) {
        if (parts.length !== 4) {
          return false;
        }

        const [_, iterationsStr, salt, storedHash] = parts;
        const iterations = parseInt(iterationsStr, 10);

        if (isNaN(iterations) || iterations <= 0) {
          return false;
        }

        const encoder = new TextEncoder();
        const passwordWithSalt = encoder.encode(password + salt);

        let hashBuffer = await crypto.subtle.digest('SHA-256', passwordWithSalt);

        for (let i = 0; i < iterations; i++) {
          const hashArray = new Uint8Array(hashBuffer);
          hashBuffer = await crypto.subtle.digest('SHA-256', hashArray);
        }

        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return storedHash === hashHex;
      } else if (hash.startsWith('bcrypt:')) {
        if (parts.length !== 3) {
          return false;
        }

        const [_, salt, storedHash] = parts;

        const encoder = new TextEncoder();
        const passwordWithSalt = encoder.encode(password + salt);

        let hashBuffer = await crypto.subtle.digest('SHA-256', passwordWithSalt);

        for (let i = 0; i < 9; i++) {
          const hashArray = new Uint8Array(hashBuffer);
          hashBuffer = await crypto.subtle.digest('SHA-256', hashArray);
        }

        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return storedHash === hashHex;
      } else if (hash.startsWith('sha256:')) {
        const storedHash = hash.substring(7);
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return storedHash === hashHex;
      }

      return false;
    } catch (error) {
      console.error('Error verifying password hash:', error);
      return false;
    }
  }

  private async recordLoginAttempt(
    userId: string,
    success: boolean,
    request: Request,
    env: Env
  ): Promise<void> {
    try {
      const now = Date.now();
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await env.R3L_DB.prepare(
        `
        INSERT INTO auth_log (
          user_id, action, success, ip_address, user_agent, timestamp
        )
        VALUES (?, 'login', ?, ?, ?, ?)
      `
      )
        .bind(userId, success ? 1 : 0, ip, userAgent, now)
        .run();
    } catch (error) {
      console.error('Error recording login attempt:', error);
    }
  }

  private async recordLogout(userId: string, request: Request, env: Env): Promise<void> {
    try {
      const now = Date.now();
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await env.R3L_DB.prepare(
        `
        INSERT INTO auth_log (
          user_id, action, success, ip_address, user_agent, timestamp
        )
        VALUES (?, 'logout', 1, ?, ?, ?)
      `
      )
        .bind(userId, ip, userAgent, now)
        .run();
    } catch (error) {
      console.error('Error recording logout:', error);
    }
  }
}
      )
