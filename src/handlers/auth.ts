import { Env } from '../types/env';
import { UserHandler } from './user';

interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  created_at: number;
  expires_at: number;
  user_agent?: string;
  ip_address?: string;
}

interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export class AuthHandler {
  private userHandler: UserHandler;
  
  constructor() {
    this.userHandler = new UserHandler();
  }
  
  /**
   * Initialize GitHub authentication
   * @param redirectUri Redirect URI for OAuth flow
   * @param env Environment bindings
   * @returns URL to redirect user to for GitHub authentication
   */
  initGitHubAuth(redirectUri: string, env: Env): string {
    const githubClientId = env.GITHUB_CLIENT_ID;
    const scopes = 'read:user user:email';
    
    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: crypto.randomUUID() // Security measure to prevent CSRF
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Complete GitHub authentication flow
   * @param code Authorization code from GitHub
   * @param redirectUri Redirect URI (must match the one used in initGitHubAuth)
   * @param userAgent User agent string
   * @param ipAddress IP address
   * @param env Environment bindings
   * @returns Authentication session details
   */
  async completeGitHubAuth(
    code: string,
    redirectUri: string,
    userAgent: string,
    ipAddress: string,
    env: Env
  ): Promise<{ sessionId: string; token: string; userId: string; isNewUser: boolean }> {
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }
    
    const tokenData = await tokenResponse.json() as {
      access_token: string;
      scope: string;
      token_type: string;
    };
    
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error('Invalid GitHub response');
    }
    
    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'R3L:F Application'
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub profile');
    }
    
    const userData = await userResponse.json() as GitHubUser;
    
    // Get user email (may be private, so separate request)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'R3L:F Application'
      }
    });
    
    let primaryEmail = null;
    if (emailResponse.ok) {
      const emails = await emailResponse.json() as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      
      // Find primary and verified email
      const primaryVerifiedEmail = emails.find(e => e.primary && e.verified);
      if (primaryVerifiedEmail) {
        primaryEmail = primaryVerifiedEmail.email;
      }
    }
    
    // Check if user already exists by GitHub ID
    let user = await this.userHandler.getUserByGitHub(userData.id.toString(), env);
    let isNewUser = false;
    
    if (!user) {
      // Create new user
      isNewUser = true;
      
      // Extract name from GitHub data
      let displayName = userData.name || userData.login;
      
      // Generate username from GitHub login
      let username = userData.login;
      // Check if username is available, if not append numbers
      let usernameAvailable = false;
      let count = 1;
      
      while (!usernameAvailable) {
        try {
          const existingUser = await this.userHandler.getUserByUsername(username, env);
          if (!existingUser) {
            usernameAvailable = true;
          } else {
            username = `${userData.login}${count}`;
            count++;
          }
        } catch (error) {
          throw new Error('Failed to check username availability');
        }
      }
      
      const userId = await this.userHandler.createUserWithGitHub(
        username, 
        displayName, 
        userData.id.toString(),
        userData.avatar_url, 
        primaryEmail,
        env
      );
      
      user = await this.userHandler.getUser(userId, env);
      
      if (!user) {
        throw new Error('Failed to create user');
      }
    }
    
    // Create auth session
    const sessionId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    
    await env.R3L_DB.prepare(`
      INSERT INTO auth_sessions (id, user_id, token, created_at, expires_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      user.id,
      token,
      now,
      expiresAt,
      userAgent || null,
      ipAddress || null
    ).run();
    
    return {
      sessionId,
      token,
      userId: user.id,
      isNewUser
    };
  }
  
  /**
   * Initialize ORCID authentication
   * @param redirectUri Redirect URI for OAuth flow
   * @param env Environment bindings
   * @returns URL to redirect user to for ORCID authentication
   */
  initOrcidAuth(redirectUri: string, env: Env): string {
    const orcidClientId = env.ORCID_CLIENT_ID;
    const scopes = '/authenticate';
    
    const params = new URLSearchParams({
      client_id: orcidClientId,
      response_type: 'code',
      scope: scopes,
      redirect_uri: redirectUri
    });
    
    return `https://orcid.org/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Complete ORCID authentication flow
   * @param code Authorization code from ORCID
   * @param redirectUri Redirect URI (must match the one used in initOrcidAuth)
   * @param userAgent User agent string
   * @param ipAddress IP address
   * @param env Environment bindings
   * @returns Authentication session details
   */
  async completeOrcidAuth(
    code: string,
    redirectUri: string,
    userAgent: string,
    ipAddress: string,
    env: Env
  ): Promise<{ sessionId: string; token: string; userId: string; isNewUser: boolean }> {
    // Exchange code for token
    const tokenResponse = await fetch('https://orcid.org/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: env.ORCID_CLIENT_ID,
        client_secret: env.ORCID_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }
    
    const tokenData = await tokenResponse.json() as {
      orcid: string;
      access_token: string;
    };
    const orcidId = tokenData.orcid;
    const accessToken = tokenData.access_token;
    
    if (!orcidId || !accessToken) {
      throw new Error('Invalid ORCID response');
    }
    
    // Get user info from ORCID
    const userResponse = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/person`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch ORCID profile');
    }
    
    const userData = await userResponse.json() as {
      name?: {
        'given-names'?: { value: string };
        'family-name'?: { value: string };
      }
    };
    
    // Check if user already exists
    let user = await this.userHandler.getUserByOrcid(orcidId, env);
    let isNewUser = false;
    
    if (!user) {
      // Create new user
      isNewUser = true;
      
      // Extract name from ORCID data
      let displayName = 'R3L User';
      if (userData.name && 
          userData.name['given-names'] && 
          userData.name['family-name'] &&
          userData.name['given-names'].value &&
          userData.name['family-name'].value) {
        displayName = `${userData.name['given-names'].value} ${userData.name['family-name'].value}`;
      }
      
      // Generate username from ORCID ID (fallback)
      const username = `user_${orcidId.replace(/-/g, '').slice(-8)}`;
      
      const userId = await this.userHandler.createUser(username, displayName, orcidId, env);
      user = await this.userHandler.getUser(userId, env);
      
      if (!user) {
        throw new Error('Failed to create user');
      }
    }
    
    // Create auth session
    const sessionId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    
    await env.R3L_DB.prepare(`
      INSERT INTO auth_sessions (id, user_id, token, created_at, expires_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      user.id,
      token,
      now,
      expiresAt,
      userAgent || null,
      ipAddress || null
    ).run();
    
    return {
      sessionId,
      token,
      userId: user.id,
      isNewUser
    };
  }
  
  /**
   * Validate an authentication token
   * @param token Authentication token
   * @param env Environment bindings
   * @returns User ID if valid, null otherwise
   */
  async validateToken(token: string, env: Env): Promise<string | null> {
    const now = Date.now();
    
    const session = await env.R3L_DB.prepare(`
      SELECT * FROM auth_sessions
      WHERE token = ? AND expires_at > ?
    `).bind(token, now).first<AuthSession>();
    
    if (!session) {
      return null;
    }
    
    return session.user_id;
  }
  
  /**
   * Refresh an authentication session
   * @param token Authentication token
   * @param env Environment bindings
   * @returns New expiration time if successful, null otherwise
   */
  async refreshSession(token: string, env: Env): Promise<number | null> {
    const now = Date.now();
    
    const session = await env.R3L_DB.prepare(`
      SELECT * FROM auth_sessions
      WHERE token = ? AND expires_at > ?
    `).bind(token, now).first<AuthSession>();
    
    if (!session) {
      return null;
    }
    
    const newExpiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    
    await env.R3L_DB.prepare(`
      UPDATE auth_sessions
      SET expires_at = ?
      WHERE token = ?
    `).bind(newExpiresAt, token).run();
    
    return newExpiresAt;
  }
  
  /**
   * End an authentication session (logout)
   * @param token Authentication token
   * @param env Environment bindings
   */
  async endSession(token: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(`
      DELETE FROM auth_sessions
      WHERE token = ?
    `).bind(token).run();
  }
  
  /**
   * End all sessions for a user
   * @param userId User ID
   * @param env Environment bindings
   */
  async endAllSessions(userId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(`
      DELETE FROM auth_sessions
      WHERE user_id = ?
    `).bind(userId).run();
  }
  
  /**
   * Get all active sessions for a user
   * @param userId User ID
   * @param env Environment bindings
   * @returns Array of active sessions
   */
  async getUserSessions(userId: string, env: Env): Promise<AuthSession[]> {
    const now = Date.now();
    
    const result = await env.R3L_DB.prepare(`
      SELECT * FROM auth_sessions
      WHERE user_id = ? AND expires_at > ?
      ORDER BY created_at DESC
    `).bind(userId, now).all<AuthSession>();
    
    return result.results || [];
  }
}
