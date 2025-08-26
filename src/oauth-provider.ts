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

  async fetch(request: Request, env: Env, ctx: ExecutionContext, user: R3LUser) {
    // The user object is already authenticated
    // Attach the user to the request for use in downstream handlers
    (request as any).user = user;
    (request as any).authenticated = true;
    (request as any).userId = user.id;

    // Route the request using our existing router
    return this.router.route(request, env);
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
    return this.router.route(request, env);
  }
}

/**
 * Create and configure the OAuth Provider
 */
export const createOAuthProvider = () => {
  return new OAuthProvider<Env, R3LUser>({
    // API routes configuration
    apiRoute: '/api/',

    // API handler for authenticated requests
    apiHandler: new ApiHandler(),

    // Default handler for non-API routes
    defaultHandler: new DefaultHandler(),

    // User authentication handler
    authorizeUser: async (request, env, ctx) => {
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
        const response = await router.handleAuthCallbacks(modifiedRequest, env);

        // If the auth was successful, extract the user data
        if (response.ok) {
          const data = await response.json();
          return data.user as R3LUser;
        }

        return null;
      } catch (error) {
        console.error('Authorization error:', error);
        return null;
      }
    },

    // Storage configuration
    storage: {
      // You can use Durable Objects, KV, or D1 for storage
      // For now, we'll use KV
      type: 'kv',
      namespace: 'R3L_SESSIONS',
    },

    // OAuth configuration
    oauth: {
      clientId: env => env.GITHUB_CLIENT_ID,
      clientSecret: env => env.GITHUB_CLIENT_SECRET,
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      // Default scope for GitHub
      scope: 'read:user user:email',
      // Callback endpoint for the OAuth flow
      redirectUri: env =>
        env.GITHUB_REDIRECT_URI || 'https://r3l.distorted.work/auth/github/callback',
    },
  });
};
