// Router.ts
// Main router for the R3L:F application
// Handles all API routes and static file serving

import { AuthHandler } from './handlers/auth';
import { UserHandler } from './handlers/user';
import { ContentHandler } from './handlers/content';
import { StatisticsHandler } from './handlers/statistics';
import { NotificationHandler } from './handlers/notification';
import { TagHandler } from './handlers/tag';
import { SearchHandler } from './handlers/search';
import { AIHandler } from './handlers/ai';
import { FileHandler } from './handlers/file';
import { GlobeHandler } from './handlers/globe';
import { DrawerHandler } from './handlers/drawer';
import { Env } from './types/env';
import { createAuthCookies, createClearAuthCookies, isSecureRequest } from './cookie-helper';

// For debugging - log route processing
const ROUTE_DEBUG = false;

export class Router {
  private authHandler: AuthHandler;
  private userHandler: UserHandler;
  private contentHandler: ContentHandler;
  private statsHandler: StatisticsHandler;
  private notificationHandler: NotificationHandler;
  private tagHandler: TagHandler;
  private searchHandler: SearchHandler;
  private aiHandler: AIHandler;
  private fileHandler: FileHandler;
  private globeHandler: GlobeHandler;
  private drawerHandler: DrawerHandler;

  constructor() {
    this.authHandler = new AuthHandler();
    this.userHandler = new UserHandler();
    this.contentHandler = new ContentHandler();
    this.statsHandler = new StatisticsHandler();
    this.notificationHandler = new NotificationHandler();
    this.tagHandler = new TagHandler();
    this.searchHandler = new SearchHandler();
    this.aiHandler = new AIHandler();
    this.fileHandler = new FileHandler();
    this.globeHandler = new GlobeHandler();
    this.drawerHandler = new DrawerHandler();
  }

  /**
   * Handle the request
   */
  async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return this.handlePreflight(request);
    }

    // Handle API routes
    if (path.startsWith('/api/')) {
      return this.handleApiRoutes(request, env, path);
    }

    // Handle static files
    return this.handleStaticFiles(request, env, path);
  }

  /**
   * Handle CORS preflight requests
   */
  private handlePreflight(request: Request): Response {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  /**
   * Handle API routes
   */
  private async handleApiRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Handle different API route groups
    if (path.startsWith('/api/auth/')) {
      return this.handleAuthRoutes(request, env, path);
    }

    if (path.startsWith('/api/users/')) {
      return this.handleUserRoutes(request, env, path);
    }

    if (path.startsWith('/api/content/')) {
      return this.handleContentRoutes(request, env, path);
    }

    if (path.startsWith('/api/stats/')) {
      return this.handleStatsRoutes(request, env, path);
    }

    if (path.startsWith('/api/notifications/')) {
      return this.handleNotificationRoutes(request, env, path);
    }

    if (path.startsWith('/api/tags/')) {
      return this.handleTagRoutes(request, env, path);
    }

    if (path.startsWith('/api/search/')) {
      return this.handleSearchRoutes(request, env, path);
    }

    if (path.startsWith('/api/ai/')) {
      return this.handleAIRoutes(request, env, path);
    }

    if (path.startsWith('/api/files/')) {
      return this.handleFileRoutes(request, env, path);
    }

    if (path.startsWith('/api/globe/')) {
      return this.handleGlobeRoutes(request, env, path);
    }

    if (path.startsWith('/api/drawer/')) {
      return this.handleDrawerRoutes(request, env, path);
    }

    if (path.startsWith('/api/debug/')) {
      return this.handleDebugRoutes(request, env, path);
    }

    // List users
    if (path === '/api/users' && request.method === 'GET') {
      const token = this.getAuthToken(request);
      const authenticatedUserId = token ? await this.authHandler.validateToken(token, env) : null;

      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const search = url.searchParams.get('search') || '';

      const users = await this.userHandler.listUsers(limit, offset, search, env);
      return this.jsonResponse(users);
    }

    return this.notFoundResponse();
  }

  /**
   * Handle authentication routes
   */
  private async handleAuthRoutes(request: Request, env: Env, path: string): Promise<Response> {
    if (ROUTE_DEBUG) console.log(`[Router] Processing auth route: ${path}`);

    // Init ORCID auth
    if (path === '/api/auth/orcid/init' && request.method === 'GET') {
      const requestUrl = new URL(request.url);
      const redirectUri = env.ORCID_REDIRECT_URI || `${requestUrl.origin}/auth/orcid/callback`;

      const authorizationUrl = this.authHandler.initOrcidAuth(redirectUri, env);

      return this.jsonResponse({ authorizationUrl });
    }

    // Complete ORCID auth
    if (path === '/api/auth/orcid/callback' && request.method === 'GET') {
      const requestUrl = new URL(request.url);
      const urlParams = requestUrl.searchParams;
      const code = urlParams.get('code');

      if (!code) {
        return this.errorResponse('Missing code parameter');
      }

      const userAgent = request.headers.get('User-Agent') || '';
      const ipAddress = request.headers.get('CF-Connecting-IP') || '';
      const redirectUri = env.ORCID_REDIRECT_URI || `${requestUrl.origin}/auth/orcid/callback`;

      try {
        const authResult = await this.authHandler.completeOrcidAuth(
          code,
          redirectUri,
          userAgent,
          ipAddress,
          env
        );

        // For API requests from the SPA, return JSON
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse({
            success: true,
            token: authResult.token,
            redirectUrl: '/',
          });
        }

        // For direct browser requests, set cookies and redirect
        const domain = requestUrl.hostname;
        const isSecure = isSecureRequest(request);

        // Create cookies with proper attributes using helper
        const headers = createAuthCookies(authResult.token, domain, isSecure);
        headers.set('Location', '/');

        // Add CORS headers if needed
        headers.set('Access-Control-Allow-Origin', requestUrl.origin);
        headers.set('Access-Control-Allow-Credentials', 'true');

        console.log(
          'ORCID auth - Set cookies successfully with SameSite=' + (isSecure ? 'None' : 'Lax')
        );

        return new Response(null, {
          status: 302,
          headers,
        });
      } catch (error) {
        console.error('ORCID auth error:', error);

        // For API requests from the SPA, return JSON error
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse(
            {
              success: false,
              message: error instanceof Error ? error.message : 'Authentication failed',
            },
            400
          );
        }

        // For direct browser requests, redirect
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/login?error=${encodeURIComponent('Authentication failed')}`,
          },
        });
      }
    }

    // Init GitHub auth
    if (path === '/api/auth/github/init' && request.method === 'GET') {
      const requestUrl = new URL(request.url);
      const redirectUri = env.GITHUB_REDIRECT_URI || `${requestUrl.origin}/auth/github/callback`;

      const authorizationUrl = this.authHandler.initGitHubAuth(redirectUri, env);

      return this.jsonResponse({ authorizationUrl });
    }

    // Complete GitHub auth
    if (path === '/api/auth/github/callback' && request.method === 'GET') {
      const requestUrl = new URL(request.url);
      const urlParams = requestUrl.searchParams;
      const code = urlParams.get('code');

      if (!code) {
        return this.errorResponse('Missing code parameter');
      }

      const userAgent = request.headers.get('User-Agent') || '';
      const ipAddress = request.headers.get('CF-Connecting-IP') || '';
      const redirectUri = env.GITHUB_REDIRECT_URI || `${requestUrl.origin}/auth/github/callback`;

      try {
        const authResult = await this.authHandler.completeGitHubAuth(
          code,
          redirectUri,
          userAgent,
          ipAddress,
          env
        );

        // For API requests from the SPA, return JSON
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse({
            success: true,
            token: authResult.token,
            redirectUrl: '/',
          });
        }

        // For direct browser requests, set cookies and redirect
        const domain = requestUrl.hostname;
        const isSecure = isSecureRequest(request);

        // Create cookies with proper attributes using helper
        const headers = createAuthCookies(authResult.token, domain, isSecure);
        headers.set('Location', '/');

        // Add CORS headers if needed
        headers.set('Access-Control-Allow-Origin', requestUrl.origin);
        headers.set('Access-Control-Allow-Credentials', 'true');

        console.log(
          'GitHub auth - Set cookies successfully with SameSite=' + (isSecure ? 'None' : 'Lax')
        );

        return new Response(null, {
          status: 302,
          headers,
        });
      } catch (error) {
        console.error('GitHub auth error:', error);

        // For API requests from the SPA, return JSON error
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse(
            {
              success: false,
              message: error instanceof Error ? error.message : 'Authentication failed',
            },
            400
          );
        }

        // For direct browser requests, redirect
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/login?error=${encodeURIComponent('Authentication failed')}`,
          },
        });
      }
    }

    // Validate token
    if (path === '/api/auth/validate' && request.method === 'GET') {
      // Check for token in auth header or cookies
      const token = this.getAuthToken(request);

      if (!token) {
        console.log('Validate endpoint - missing token, cookies:', request.headers.get('Cookie'));
        return this.errorResponse('Missing authentication token', 401);
      }

      console.log('Validate endpoint - token found, validating:', token.slice(0, 10) + '...');
      const userId = await this.authHandler.validateToken(token, env);

      if (!userId) {
        console.log('Validate endpoint - invalid token');
        return this.errorResponse('Invalid or expired token', 401);
      }

      console.log('Validate endpoint - valid token, getting user:', userId);
      const user = await this.userHandler.getUser(userId, env);

      // Set CORS headers for credentials
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      });

      return this.jsonResponse({ valid: true, user }, 200, headers);
    }

    // Refresh session
    if (path === '/api/auth/refresh' && request.method === 'POST') {
      const token = this.getAuthToken(request);
      if (!token) {
        return this.errorResponse('Missing authentication token', 401);
      }

      const newExpiresAt = await this.authHandler.refreshSession(token, env);
      if (!newExpiresAt) {
        return this.errorResponse('Invalid or expired token', 401);
      }

      return this.jsonResponse({ success: true, expires_at: newExpiresAt });
    }

    // Logout
    if (path === '/api/auth/logout' && request.method === 'POST') {
      const token = this.getAuthToken(request);
      if (token) {
        await this.authHandler.endSession(token, env);
      }

      // Get the domain from the request URL
      const domain = new URL(request.url).hostname;
      const isSecure = isSecureRequest(request);

      // Create headers with both expired cookies
      const headers = createClearAuthCookies(domain, isSecure);

      console.log('Clearing auth cookies with domain:', domain);

      return this.jsonResponse({ success: true }, 200, headers);
    }

    // Test cookie endpoint for debugging
    if (path === '/api/auth/test-cookies' && request.method === 'GET') {
      return this.fixAuthStateCookie(request);
    }

    // Fix auth state cookie - new dedicated endpoint
    if (path === '/api/auth/fix-cookies' && request.method === 'GET') {
      return this.fixAuthStateCookie(request);
    }

    return this.notFoundResponse();
  }

  /**
   * Handle user routes
   */
  private async handleUserRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Get authenticated user first
    const token = this.getAuthToken(request);
    let authenticatedUserId: string | null = null;

    if (token) {
      authenticatedUserId = await this.authHandler.validateToken(token, env);
    }

    // Get user profile
    if (path.match(/^\/api\/users\/[^/]+$/) && request.method === 'GET') {
      const userId = path.split('/').pop() as string;
      const user = await this.userHandler.getUser(userId, env);

      if (!user) {
        return this.errorResponse('User not found', 404);
      }

      return this.jsonResponse(user);
    }

    // Update user profile - requires authentication
    if (path.match(/^\/api\/users\/[^/]+$/) && request.method === 'PATCH') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }

      const userId = path.split('/').pop() as string;

      if (authenticatedUserId !== userId) {
        return this.errorResponse('Unauthorized', 403);
      }

      const data = (await request.json()) as any;
      await this.userHandler.updateUserProfile(userId, data, env);

      return this.jsonResponse({ success: true });
    }

    // Update user preferences - requires authentication
    if (path.match(/^\/api\/users\/[^/]+\/preferences$/) && request.method === 'PATCH') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }

      const userId = path.split('/')[3];

      if (authenticatedUserId !== userId) {
        return this.errorResponse('Unauthorized', 403);
      }

      const data = (await request.json()) as any;
      await this.userHandler.updateUserPreferences(userId, data, env);

      return this.jsonResponse({ success: true });
    }

    // Get user notifications - requires authentication
    if (path.match(/^\/api\/users\/[^/]+\/notifications$/) && request.method === 'GET') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }

      const userId = path.split('/')[3];

      if (authenticatedUserId !== userId) {
        return this.errorResponse('Unauthorized', 403);
      }

      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const notifications = await this.userHandler.getUserNotifications(userId, limit, offset, env);
      return this.jsonResponse(notifications);
    }

    // Mark notifications as read - requires authentication
    if (path.match(/^\/api\/users\/[^/]+\/notifications\/read$/) && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }

      const userId = path.split('/')[3];

      if (authenticatedUserId !== userId) {
        return this.errorResponse('Unauthorized', 403);
      }

      const data = (await request.json()) as { ids: string[] };
      if (!Array.isArray(data.ids)) {
        return this.errorResponse('Invalid request body');
      }

      await this.userHandler.markNotificationsAsRead(userId, data.ids, env);
      return this.jsonResponse({ success: true });
    }

    // Get user files
    if (path.match(/^\/api\/users\/[^/]+\/files$/) && request.method === 'GET') {
      const userId = path.split('/')[3];

      // Only allow authenticated user to see their own files
      if (authenticatedUserId !== userId) {
        return this.errorResponse('Unauthorized', 403);
      }

      const url = new URL(request.url);
      const filter = url.searchParams.get('filter') || 'all';
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      try {
        // Query DB for user files
        let query = `
          SELECT * FROM content 
          WHERE user_id = ?
        `;

        const params = [userId];

        // Apply filter
        switch (filter) {
          case 'public':
            query += ' AND is_public = 1';
            break;
          case 'private':
            query += ' AND is_public = 0';
            break;
          case 'expiring':
            query += ' AND expires_at IS NOT NULL AND expires_at < ? AND is_archived = 0';
            params.push((Date.now() + 2 * 24 * 60 * 60 * 1000).toString()); // 2 days from now
            break;
          case 'archived':
            query += ' AND is_archived = 1';
            break;
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit.toString(), offset.toString());

        const result = await env.R3L_DB.prepare(query)
          .bind(...params)
          .all();
        const files = result.results || [];

        return this.jsonResponse({ files });
      } catch (error) {
        console.error('Error fetching user files:', error);
        return this.errorResponse('Failed to fetch files');
      }
    }

    // Get user stats - requires authentication for private stats
    if (path.match(/^\/api\/users\/[^/]+\/stats$/) && request.method === 'GET') {
      const userId = path.split('/')[3];

      // Only allow authenticated user to see their own stats
      if (authenticatedUserId !== userId) {
        return this.errorResponse('Unauthorized', 403);
      }

      try {
        // Get total files count
        const totalFilesResult = await env.R3L_DB.prepare(
          `
          SELECT COUNT(*) as count FROM content WHERE user_id = ?
        `
        )
          .bind(userId)
          .first<{ count: number }>();

        // Get archived files count
        const archivedFilesResult = await env.R3L_DB.prepare(
          `
          SELECT COUNT(*) as count FROM content WHERE user_id = ? AND is_archived = 1
        `
        )
          .bind(userId)
          .first<{ count: number }>();

        // Get connections count (this is a placeholder - implement based on your connections schema)
        const connectionsResult = await env.R3L_DB.prepare(
          `
          SELECT COUNT(*) as count FROM connections WHERE user_id = ? OR connected_user_id = ?
        `
        )
          .bind(userId, userId)
          .first<{ count: number }>();

        const stats = {
          total_files: totalFilesResult?.count || 0,
          archived_files: archivedFilesResult?.count || 0,
          connections: connectionsResult?.count || 0,
        };

        return this.jsonResponse(stats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
        return this.errorResponse('Failed to fetch user stats');
      }
    }

    return this.notFoundResponse();
  }

  /**
   * Handle content routes
   */
  private async handleContentRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Get authenticated user first
    const token = this.getAuthToken(request);
    let authenticatedUserId: string | null = null;

    if (token) {
      authenticatedUserId = await this.authHandler.validateToken(token, env);
    }

    // Handle content routes
    return this.notFoundResponse();
  }

  /**
   * Handle stats routes
   */
  private async handleStatsRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
    return this.notFoundResponse();
  }

  /**
   * Handle notification routes
   */
  private async handleNotificationRoutes(
    _request: Request,
    _env: Env,
    _path: string
  ): Promise<Response> {
    return this.notFoundResponse();
  }

  /**
   * Handle tag routes
   */
  private async handleTagRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
    return this.notFoundResponse();
  }

  /**
   * Handle AI routes
   */
  private async handleAIRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
    return this.notFoundResponse();
  }

  /**
   * Handle file routes
   */
  private async handleFileRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
    return this.notFoundResponse();
  }

  /**
   * Handle globe routes
   */
  private async handleGlobeRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
    return this.notFoundResponse();
  }

  /**
   * Handle debug routes
   */
  private async handleDebugRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Environment check endpoint
    if (path === '/api/debug/env-check' && request.method === 'GET') {
      // Get authenticated user first - require authentication for this endpoint
      const token = this.getAuthToken(request);
      let authenticatedUserId: string | null = null;

      if (token) {
        authenticatedUserId = await this.authHandler.validateToken(token, env);
      }

      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }

      // Check if required environment variables are set
      const checks = {
        github: {
          client_id: !!env.GITHUB_CLIENT_ID,
          client_secret: !!env.GITHUB_CLIENT_SECRET,
          redirect_uri: !!env.GITHUB_REDIRECT_URI,
        },
        orcid: {
          client_id: !!env.ORCID_CLIENT_ID,
          client_secret: !!env.ORCID_CLIENT_SECRET,
          redirect_uri: !!env.ORCID_REDIRECT_URI,
        },
        services: {
          db: true, // Always true as it's a required binding
          kv: true,
          r2: true,
        },
      };

      return this.jsonResponse({
        checks,
        timestamp: Date.now(),
      });
    }

    // Cookie check endpoint
    if (path === '/api/debug/cookie-check' && request.method === 'GET') {
      const cookies = request.headers.get('Cookie') || '';

      // Extract cookies
      const cookieObj: { [key: string]: string } = {};
      cookies.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length === 2) {
          cookieObj[parts[0]] = parts[1];
        }
      });

      return this.jsonResponse({
        cookies: cookieObj,
        raw: cookies,
        hasAuthState: cookies.includes('r3l_auth_state'),
        hasSession: cookies.includes('r3l_session'),
        userAgent: request.headers.get('User-Agent'),
        isSecure: isSecureRequest(request),
      });
    }

    return this.notFoundResponse();
  }

  /**
   * Handle drawer routes
   */
  private async handleDrawerRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Get authenticated user first
    const token = this.getAuthToken(request);
    let authenticatedUserId: string | null = null;

    if (token) {
      authenticatedUserId = await this.authHandler.validateToken(token, env);
    }

    // Get user drawers
    if (path === '/api/drawers/user' && request.method === 'GET') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }

      const drawers = await this.drawerHandler.getUserDrawers(authenticatedUserId, env);
      return this.jsonResponse(drawers);
    }

    // Other drawer routes
    return this.notFoundResponse();
  }

  /**
   * Handle association routes
   */
  private async handleAssociationRoutes(
    _request: Request,
    _env: Env,
    _path: string
  ): Promise<Response> {
    // Implement association routes
    return this.notFoundResponse();
  }

  /**
   * Handle search routes
   */
  private async handleSearchRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Basic search
    if (path === '/api/search' && request.method === 'GET') {
      const url = new URL(request.url);
      const query = url.searchParams.get('q') || '';
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      // Parse filters
      const type = url.searchParams.getAll('type');
      const dateStart = url.searchParams.get('date_start');
      const dateEnd = url.searchParams.get('date_end');

      const filters: any = {};
      if (type.length > 0) filters.type = type;
      if (dateStart || dateEnd) {
        filters.dateRange = {};
        if (dateStart) filters.dateRange.start = parseInt(dateStart);
        if (dateEnd) filters.dateRange.end = parseInt(dateEnd);
      }

      // Get user ID for visibility filtering
      const token = this.getAuthToken(request);
      let userId = null;
      if (token) {
        userId = await this.authHandler.validateToken(token, env);
        if (userId) {
          filters.userId = userId;
          filters.visibility = 'both';
        }
      }

      const results = await this.searchHandler.basicSearch(query, filters, limit, offset, env);
      return this.jsonResponse(results);
    }

    // Other search routes
    return this.notFoundResponse();
  }

  /**
   * Handle static files route
   */
  private async handleStaticFiles(request: Request, env: Env, path: string): Promise<Response> {
    // Implement static file handling here
    return new Response('Static file handling not implemented', { status: 501 });
  }

  /**
   * Extract authentication token from request
   */
  private getAuthToken(request: Request): string | null {
    // Check Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check for token in cookie if not in header
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/r3l_session=([^;]+)/);
      if (match) {
        return match[1];
      }
    }

    // If we got here and still don't have a token, but we have the auth state cookie,
    // the session cookie might have been lost or not set correctly.
    if (cookieHeader && cookieHeader.includes('r3l_auth_state=true')) {
      console.log('Found auth state cookie but no session cookie - auth state mismatch');
    }

    return null;
  }

  /**
   * Fix auth state cookie
   */
  private fixAuthStateCookie(request: Request): Response {
    const url = new URL(request.url);
    const domain = url.hostname;
    const isSecure = isSecureRequest(request);

    // Set secure attribute based on environment
    const secureFlag = isSecure ? 'Secure; ' : '';
    const sameSite = isSecure ? 'None' : 'Lax';

    const cookieOptions = `Path=/; Max-Age=2592000; SameSite=${sameSite}; ${secureFlag}`;

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': url.origin,
      'Access-Control-Allow-Credentials': 'true',
      'Set-Cookie': `r3l_auth_state=true; ${cookieOptions}`,
    });

    console.log('Setting auth state cookie:', `r3l_auth_state=true; ${cookieOptions}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auth state cookie fixed',
      }),
      {
        status: 200,
        headers,
      }
    );
  }

  /**
   * Create a JSON response
   */
  private jsonResponse(data: any, status: number = 200, customHeaders?: Headers): Response {
    const headers =
      customHeaders ||
      new Headers({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      });

    // Ensure Content-Type is set
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return new Response(JSON.stringify(data), {
      status,
      headers,
    });
  }

  /**
   * Create an error response
   */
  private errorResponse(message: string, status: number = 400): Response {
    return this.jsonResponse({ error: message }, status);
  }

  /**
   * Create a not found response
   */
  private notFoundResponse(): Response {
    return this.errorResponse('Not found', 404);
  }
}
