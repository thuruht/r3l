import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { Env } from '../types/env.js';
import { Router } from '../router.js';

// Define the default handler
const defaultHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Create a router instance to handle all non-OAuth routes
    const router = new Router();
    return router.route(request, env);
  },
};

// Define the API handler
const apiHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext & { props: any }) {
    // The API handler receives props that contain user info from the OAuth token
    const userId = ctx.props.userId;

    // Create a custom request object with the authenticated user ID
    const authenticatedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: request.redirect,
      signal: request.signal,
    });

    // Add the authenticated user ID to the request
    (authenticatedRequest as any).authenticated = true;
    (authenticatedRequest as any).userId = userId;

    // Create a router instance to handle API routes
    const router = new Router();
    return router.route(authenticatedRequest, env);
  },
};

// Create the OAuth provider
export function createOAuthProvider(env: Env) {
  return new OAuthProvider({
    // API routes that require authentication
    apiRoute: ['/api/users/', '/api/content/', '/api/drawers/', '/api/associations/'],

    // Handlers
    apiHandler,
    defaultHandler,

    // OAuth endpoints
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/oauth/token',
    clientRegistrationEndpoint: '/oauth/register',

    // Supported scopes
    scopesSupported: ['profile', 'content.read', 'content.write', 'drawers'],

    // Error handling
    onError({ code, description, status }) {
      console.warn(`OAuth error response: ${status} ${code} - ${description}`);
    },
  });
}

// Helper to set up OAuth clients for ORCID and GitHub
export async function setupOAuthClients(env: Env) {
  // Get the OAuthHelpers interface from the env binding
  const oauthHelpers = env.OAUTH_PROVIDER;

  // Check if clients already exist
  const orcidClient = await oauthHelpers.lookupClient('orcid-client');
  const githubClient = await oauthHelpers.lookupClient('github-client');

  // Create ORCID client if it doesn't exist
  if (!orcidClient) {
    await oauthHelpers.createClient({
      clientId: 'orcid-client',
      clientSecret: env.ORCID_CLIENT_SECRET,
      clientName: 'ORCID Authentication',
      redirectUris: [env.ORCID_REDIRECT_URI || 'https://r3l.distorted.work/auth/orcid/callback'],
      logoUri: 'https://orcid.org/assets/vectors/orcid.logo.icon.svg',
      clientUri: 'https://orcid.org',
      scope: 'profile content.read content.write drawers',
    });
  }

  // Create GitHub client if it doesn't exist
  if (!githubClient) {
    await oauthHelpers.createClient({
      clientId: 'github-client',
      clientSecret: env.GITHUB_CLIENT_SECRET,
      clientName: 'GitHub Authentication',
      redirectUris: [env.GITHUB_REDIRECT_URI || 'https://r3l.distorted.work/auth/github/callback'],
      logoUri: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      clientUri: 'https://github.com',
      scope: 'profile content.read content.write drawers',
    });
  }
}

// Function to handle ORCID user data retrieval after authentication
export async function getOrcidUserData(accessToken: string, orcidId: string) {
  const response = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/person`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch ORCID profile');
  }

  return await response.json();
}

// Function to handle GitHub user data retrieval after authentication
export async function getGithubUserData(accessToken: string) {
  // Get basic user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/json',
      Authorization: `token ${accessToken}`,
      'User-Agent': 'R3L:F Application',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch GitHub profile');
  }

  const userData = (await userResponse.json()) as any;

  // Get user email (may be private, so separate request)
  const emailResponse = await fetch('https://api.github.com/user/emails', {
    headers: {
      Accept: 'application/json',
      Authorization: `token ${accessToken}`,
      'User-Agent': 'R3L:F Application',
    },
  });

  let primaryEmail = null;
  if (emailResponse.ok) {
    const emails = (await emailResponse.json()) as any[];

    // Find primary and verified email
    const primaryVerifiedEmail = emails.find(e => e.primary && e.verified);
    if (primaryVerifiedEmail) {
      primaryEmail = primaryVerifiedEmail.email;
    }
  }

  return {
    ...userData,
    primaryEmail,
  };
}
