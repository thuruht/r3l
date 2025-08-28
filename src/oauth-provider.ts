import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { Router } from './router.js';
import { Env } from './types/env.js';

/**
 * User object structure returned by the authorization system
 */
export interface R3LUser {
  id: string;
  username: string;
  display_name: string;
  orcid_id?: string;
  github_id?: string;
  email?: string;
  avatar_key?: string;
}

/**
 * API Handler class to process authenticated requests
 */
class ApiHandler {
  router: Router;

  constructor() {
    this.router = new Router();
  }

  // The OAuth provider will attach an authenticated user to the request
  // We read that user from the request object and forward to our router.
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const user = (request as any).user as R3LUser | undefined;
    if (user) {
      (request as any).authenticated = true;
      (request as any).userId = user.id;
    }

    // Route the request using our existing router (router.handle matches our Router API)
    return this.router.handle(request, env);
  }
}

/**
 * Default handler for non-API routes
 */
class DefaultHandler {
  router: Router;

  constructor() {
    this.router = new Router();
  }

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // For non-API routes, we still want to use our router
    // to handle static assets and other routes
    return this.router.handle(request, env);
  }
}

/**
 * Create and configure the OAuth Provider
 */
export const createOAuthProvider = () => {
  // Cast to any for the third-party library until types are aligned with our Router signature
  const OAuthProviderAny = OAuthProvider as any;
  return new OAuthProviderAny({
    // API routes configuration
    apiRoute: '/api/',

    // API handler for authenticated requests
  apiHandler: (new ApiHandler() as any),

    // Default handler for non-API routes
  defaultHandler: (new DefaultHandler() as any),

    // User authentication handler
  authorizeUser: async (request: any, env: any, ctx: any) => {
      // Extract the auth code or token from the request
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const provider = url.searchParams.get('provider') || 'github';

      if (!code) {
        return null;
      }

      try {
        // Use our existing auth handler to process the OAuth flow
        const router = new Router();

        // Create a modified request with appropriate path for the router
        const callbackPath = `/api/auth/${provider}/callback`;
        const callbackUrl = new URL(callbackPath, url.origin);
        callbackUrl.searchParams.set('code', code);

        // Clone the request with a new URL
        const modifiedRequest = new Request(callbackUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        // Process the request through our router
  // Use our router.handle which accepts (request, env)
  const response = await router.handle(modifiedRequest, env);

        // If the auth was successful, extract the user data
        if (response.ok) {
          const data: any = await response.json();
          return data.user as R3LUser;
        }

        return null;
      } catch (error) {
        console.error('Authorization error:', error);
        return null;
      }
    },

    // Storage configuration (use env accessor so the provider can resolve the KV at runtime)
    storage: {
      type: 'kv',
      namespace: (env: any) => env.R3L_SESSIONS,
    },

    // OAuth configuration
    oauth: {
  clientId: (env: any) => env.GITHUB_CLIENT_ID,
  clientSecret: (env: any) => env.GITHUB_CLIENT_SECRET,
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      // Default scope for GitHub
      scope: 'read:user user:email',
      // Callback endpoint for the OAuth flow
      redirectUri: (env: any) => env.GITHUB_REDIRECT_URI || 'https://r3l.distorted.work/auth/github/callback',
    },
  });
};

export default createOAuthProvider as any;
