import { Env } from '../types/env';
import { UserHandler } from './user';
import { AuthServiceAdapter } from '../auth-service-adapter';

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
  async initGitHubAuth(redirectUri: string, env: Env): Promise<string> {
    console.log("GitHub auth - starting auth flow with redirect URI:", redirectUri);
    
    try {
      // Use the auth service adapter to get the authorization URL
      const authUrl = await AuthServiceAdapter.initGitHubAuth(env, redirectUri);
      console.log("GitHub auth - received auth URL from OpenAuth service");
      return authUrl;
    } catch (error) {
      console.error("GitHub auth - error initializing GitHub auth:", error);
      throw error;
    }
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
    console.log("GitHub auth - completing auth flow with code:", code?.substring(0, 5) + "...");
    console.log("GitHub auth - using redirect URI:", redirectUri);
    
    try {
      // Use the auth service adapter to complete the auth flow
      const authResult = await AuthServiceAdapter.completeAuth(env, code, 'github', redirectUri);
      console.log("GitHub auth - received auth result from OpenAuth service");
      
      if (!authResult || !authResult.user || !authResult.token) {
        console.error("GitHub auth - invalid auth result from OpenAuth service");
        throw new Error("Invalid authentication result from OpenAuth service");
      }
      
      // The auth service already created or retrieved the user
      const userId = authResult.user.id;
      const token = authResult.token;
      const isNewUser = authResult.isNewUser || false;
      
      console.log("GitHub auth - successful authentication for user:", userId);
      return {
        sessionId: crypto.randomUUID(), // Just for compatibility
        token,
        userId,
        isNewUser
      };
    } catch (error) {
      console.error("GitHub auth - error completing GitHub auth:", error);
      throw error;
    }
  }
  
  /**
   * Initialize ORCID authentication
   * @param redirectUri Redirect URI for OAuth flow
   * @param env Environment bindings
   * @returns URL to redirect user to for ORCID authentication
   */
  async initOrcidAuth(redirectUri: string, env: Env): Promise<string> {
    console.log("ORCID auth - starting auth flow with redirect URI:", redirectUri);
    
    try {
      // Use the auth service adapter to get the authorization URL
      const authUrl = await AuthServiceAdapter.initOrcidAuth(env, redirectUri);
      console.log("ORCID auth - received auth URL from OpenAuth service");
      return authUrl;
    } catch (error) {
      console.error("ORCID auth - error initializing ORCID auth:", error);
      throw error;
    }
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
    console.log("ORCID auth - completing auth flow with code:", code?.substring(0, 5) + "...");
    console.log("ORCID auth - using redirect URI:", redirectUri);
    
    try {
      // Use the auth service adapter to complete the auth flow
      const authResult = await AuthServiceAdapter.completeAuth(env, code, 'orcid', redirectUri);
      console.log("ORCID auth - received auth result from OpenAuth service");
      
      if (!authResult || !authResult.user || !authResult.token) {
        console.error("ORCID auth - invalid auth result from OpenAuth service");
        throw new Error("Invalid authentication result from OpenAuth service");
      }
      
      // The auth service already created or retrieved the user
      const userId = authResult.user.id;
      const token = authResult.token;
      const isNewUser = authResult.isNewUser || false;
      
      console.log("ORCID auth - successful authentication for user:", userId);
      return {
        sessionId: crypto.randomUUID(), // Just for compatibility
        token,
        userId,
        isNewUser
      };
    } catch (error) {
      console.error("ORCID auth - error completing ORCID auth:", error);
      throw error;
    }
  }
  
  /**
   * Validate an authentication token
   * @param token Authentication token
   * @param env Environment bindings
   * @returns User ID if valid, null otherwise
   */
  async validateToken(token: string, env: Env): Promise<string | null> {
    console.log('AuthHandler - validateToken called, token length:', token.length);
    
    try {
      // Use the auth service adapter to validate the token
      const user = await AuthServiceAdapter.validateSession(env, token);
      
      if (!user || !user.id) {
        console.log('AuthHandler - validateToken: No valid session found');
        return null;
      }
      
      console.log('AuthHandler - validateToken: Valid session found for user:', user.id);
      return user.id;
    } catch (error) {
      console.error('AuthHandler - validateToken error:', error);
      return null;
    }
  }
  
  /**
   * End an authentication session (logout)
   * @param token Authentication token
   * @param env Environment bindings
   */
  async endSession(token: string, env: Env): Promise<void> {
    console.log('AuthHandler - endSession called');
    
    try {
      // Use the auth service adapter to end the session
      await AuthServiceAdapter.endSession(env, token);
      console.log('AuthHandler - session ended successfully');
    } catch (error) {
      console.error('AuthHandler - error ending session:', error);
      throw error;
    }
  }
}
