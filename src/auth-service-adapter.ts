// Auth service adapter
// This file provides methods to interact with the OpenAuth service

import { Env } from './types/env';

// Extend Env type to include the AUTH_SERVICE binding
declare module './types/env' {
  interface Env {
    AUTH_SERVICE: Fetcher;
  }
}

export class AuthServiceAdapter {
  /**
   * Initialize GitHub OAuth flow
   */
  static async initGitHubAuth(env: Env, redirectUri: string): Promise<string> {
    console.log("AuthServiceAdapter - initGitHubAuth with redirectUri:", redirectUri);
    
    const authUrl = new URL('/authorize', 'https://auth-service');
    authUrl.searchParams.set('client_id', 'your-client-id');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('provider', 'github');
    
    try {
      console.log("AuthServiceAdapter - making request to auth service:", authUrl.toString());
      
      // Make request to auth service
      const response = await env.AUTH_SERVICE.fetch(authUrl.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("AuthServiceAdapter - error response from auth service:", errorText);
        throw new Error(`Failed to initialize GitHub auth: ${response.statusText}`);
      }
      
      const data = await response.json() as {authorizationUrl: string};
      console.log("AuthServiceAdapter - received auth URL from service");
      return data.authorizationUrl;
    } catch (error) {
      console.error('AuthServiceAdapter - error initializing GitHub auth:', error);
      throw error;
    }
  }
  
  /**
   * Initialize ORCID OAuth flow
   */
  static async initOrcidAuth(env: Env, redirectUri: string): Promise<string> {
    console.log("AuthServiceAdapter - initOrcidAuth with redirectUri:", redirectUri);
    
    const authUrl = new URL('/authorize', 'https://auth-service');
    authUrl.searchParams.set('client_id', 'your-client-id');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('provider', 'orcid');
    
    try {
      console.log("AuthServiceAdapter - making request to auth service:", authUrl.toString());
      
      // Make request to auth service
      const response = await env.AUTH_SERVICE.fetch(authUrl.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("AuthServiceAdapter - error response from auth service:", errorText);
        throw new Error(`Failed to initialize ORCID auth: ${response.statusText}`);
      }
      
      const data = await response.json() as {authorizationUrl: string};
      console.log("AuthServiceAdapter - received auth URL from service");
      return data.authorizationUrl;
    } catch (error) {
      console.error('AuthServiceAdapter - error initializing ORCID auth:', error);
      throw error;
    }
  }
  
  /**
   * Complete OAuth flow with code from provider
   */
  static async completeAuth(env: Env, code: string, provider: string, redirectUri: string): Promise<any> {
    console.log(`AuthServiceAdapter - completeAuth for ${provider} with code: ${code.substring(0, 5)}...`);
    
    const callbackUrl = new URL('/callback', 'https://auth-service');
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('provider', provider);
    callbackUrl.searchParams.set('redirect_uri', redirectUri);
    
    try {
      console.log("AuthServiceAdapter - making request to auth service:", callbackUrl.toString());
      
      // Make request to auth service
      const response = await env.AUTH_SERVICE.fetch(callbackUrl.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AuthServiceAdapter - error completing ${provider} auth:`, errorText);
        throw new Error(`Failed to complete ${provider} auth: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`AuthServiceAdapter - ${provider} auth completed successfully`);
      return data;
    } catch (error) {
      console.error(`AuthServiceAdapter - error completing ${provider} auth:`, error);
      throw error;
    }
  }
  
  /**
   * Validate user session
   */
  static async validateSession(env: Env, token: string): Promise<any> {
    console.log(`AuthServiceAdapter - validateSession with token: ${token.substring(0, 5)}...`);
    
    const validateUrl = new URL('/validate', 'https://auth-service');
    
    try {
      console.log("AuthServiceAdapter - making request to auth service:", validateUrl.toString());
      
      // Make request to auth service
      const response = await env.AUTH_SERVICE.fetch(validateUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.log(`AuthServiceAdapter - session validation failed: ${response.status}`);
        return null;
      }
      
      const data = await response.json() as {user: any};
      console.log("AuthServiceAdapter - session validated successfully");
      return data.user;
    } catch (error) {
      console.error('AuthServiceAdapter - error validating session:', error);
      return null;
    }
  }
  
  /**
   * End user session
   */
  static async endSession(env: Env, token: string): Promise<boolean> {
    console.log(`AuthServiceAdapter - endSession with token: ${token.substring(0, 5)}...`);
    
    const logoutUrl = new URL('/logout', 'https://auth-service');
    
    try {
      console.log("AuthServiceAdapter - making request to auth service:", logoutUrl.toString());
      
      // Make request to auth service
      const response = await env.AUTH_SERVICE.fetch(logoutUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const success = response.ok;
      console.log(`AuthServiceAdapter - session ended: ${success}`);
      return success;
    } catch (error) {
      console.error('AuthServiceAdapter - error ending session:', error);
      return false;
    }
  }
}
