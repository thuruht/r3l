import { Env } from './types/env';
import { UserHandler } from './handlers/user';
import { AuthHandler } from './handlers/auth';
import { ContentHandler } from './handlers/content';
import { DrawerHandler } from './handlers/drawer';
import { AssociationHandler } from './handlers/associations';
import { SearchHandler } from './handlers/search';
import { ContentLifecycle } from './handlers/expiration';
import { RandomDrawerHandler } from './handlers/random-drawer';
import { ContentCopyHandler } from './handlers/content-copy';
import { TagHandler } from './handlers/tag';

export class Router {
  userHandler: UserHandler;
  authHandler: AuthHandler;
  contentHandler: ContentHandler;
  drawerHandler: DrawerHandler;
  associationHandler: AssociationHandler;
  searchHandler: SearchHandler;
  contentLifecycle: ContentLifecycle;
  randomDrawerHandler: RandomDrawerHandler;
  tagHandler: TagHandler;
  
  constructor() {
    this.userHandler = new UserHandler();
    this.authHandler = new AuthHandler();
    this.contentHandler = new ContentHandler();
    this.drawerHandler = new DrawerHandler();
    this.associationHandler = new AssociationHandler();
    this.searchHandler = new SearchHandler();
    this.contentLifecycle = new ContentLifecycle();
    this.randomDrawerHandler = new RandomDrawerHandler();
    this.tagHandler = new TagHandler();
  }
  
  /**
   * Route an API request to the appropriate handler
   * @param request The incoming request
   * @param env Environment bindings
   * @returns Response object
   */
  async route(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return this.handleCors();
    }
    
    try {
      // Authentication endpoints
      if (path.startsWith('/api/auth')) {
        return await this.handleAuthRoutes(request, env, path);
      }
      
      // User endpoints
      if (path.startsWith('/api/users')) {
        return await this.handleUserRoutes(request, env, path);
      }
      
      // Content endpoints
      if (path.startsWith('/api/content')) {
        return await this.handleContentRoutes(request, env, path);
      }
      
      // Drawer endpoints
      if (path.startsWith('/api/drawers')) {
        return await this.handleDrawerRoutes(request, env, path);
      }
      
      // Association endpoints
      if (path.startsWith('/api/associations')) {
        return await this.handleAssociationRoutes(request, env, path);
      }
      
      // Search endpoints
      if (path.startsWith('/api/search')) {
        return await this.handleSearchRoutes(request, env, path);
      }
      
      // Scheduled tasks
      if (path === '/api/tasks/process-expirations' && request.method === 'POST') {
        await this.contentLifecycle.processExpirations(env);
        return this.jsonResponse({ success: true });
      }
      
      // Random drawer endpoint
      if (path === '/api/random-drawer' && request.method === 'GET') {
        return await this.randomDrawerHandler.getRandomDrawer(request, env);
      }
      
      // Default route for static assets
      return this.notFoundResponse();
      
    } catch (error) {
      console.error('Router error:', error);
      return this.errorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Handle authentication routes
   */
  private async handleAuthRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Initialize ORCID auth
    if (path === '/api/auth/orcid/init' && request.method === 'GET') {
      const url = new URL(request.url);
      const redirectUri = url.searchParams.get('redirect_uri');
      
      if (!redirectUri) {
        return this.errorResponse('Missing redirect_uri parameter');
      }
      
      const authUrl = this.authHandler.initOrcidAuth(redirectUri, env);
      return this.jsonResponse({ url: authUrl });
    }
    
    // Complete ORCID auth
    if (path === '/api/auth/orcid/callback' && request.method === 'POST') {
      const data = await request.json() as any;
      const { code, redirect_uri } = data;
      
      if (!code || !redirect_uri) {
        return this.errorResponse('Missing required parameters');
      }
      
      const userAgent = request.headers.get('User-Agent') || '';
      const ipAddress = request.headers.get('CF-Connecting-IP') || '';
      
      const authResult = await this.authHandler.completeOrcidAuth(
        code,
        redirect_uri,
        userAgent,
        ipAddress,
        env
      );
      
      return this.jsonResponse(authResult);
    }
    
    // Validate token
    if (path === '/api/auth/validate' && request.method === 'GET') {
      const token = this.getAuthToken(request);
      if (!token) {
        return this.errorResponse('Missing authentication token', 401);
      }
      
      const userId = await this.authHandler.validateToken(token, env);
      if (!userId) {
        return this.errorResponse('Invalid or expired token', 401);
      }
      
      const user = await this.userHandler.getUser(userId, env);
      return this.jsonResponse({ valid: true, user });
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
      
      return this.jsonResponse({ success: true });
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
      
      const data = await request.json() as any;
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
      
      const data = await request.json() as any;
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
      
      const data = await request.json() as { ids: string[] };
      if (!Array.isArray(data.ids)) {
        return this.errorResponse('Invalid request body');
      }
      
      await this.userHandler.markNotificationsAsRead(userId, data.ids, env);
      return this.jsonResponse({ success: true });
    }
    
    // Get user stats - requires authentication for private stats
    if (path.match(/^\/api\/users\/[^/]+\/stats$/) && request.method === 'GET') {
      const userId = path.split('/')[3];
      
      // Only allow authenticated user to see their own stats
      if (authenticatedUserId !== userId) {
        return this.errorResponse('Unauthorized', 403);
      }
      
      const stats = await this.userHandler.getUserStats(userId, env);
      return this.jsonResponse(stats);
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
    
    // Handle content copy
    if (path === '/api/content/copy' && request.method === 'POST') {
      // Attach user auth info to request
      (request as any).authenticated = !!authenticatedUserId;
      (request as any).userId = authenticatedUserId;
      
      const contentCopyHandler = new ContentCopyHandler();
      return await contentCopyHandler.handleCopyContent(request as any, env);
    }
    
    // Handle explicit voting
    if (path === '/api/content/vote' && request.method === 'POST') {
      // Attach user auth info to request
      (request as any).authenticated = !!authenticatedUserId;
      (request as any).userId = authenticatedUserId;
      
      const contentCopyHandler = new ContentCopyHandler();
      return await contentCopyHandler.handleExplicitVote(request as any, env);
    }
    
    // Handle content download
    if (path.startsWith('/api/content/download/') && request.method === 'GET') {
      // Attach user auth info to request
      (request as any).authenticated = !!authenticatedUserId;
      (request as any).userId = authenticatedUserId;
      
      const contentCopyHandler = new ContentCopyHandler();
      return await contentCopyHandler.handleDownloadContent(request as any, env);
    }
    
    // Handle tag management - add tags
    if (path.match(/^\/api\/content\/[^/]+\/tags$/) && request.method === 'POST') {
      // Require authentication
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/')[3];
      const data = await request.json() as { tags: string[] };
      
      if (!Array.isArray(data.tags)) {
        return this.errorResponse('Invalid tags format');
      }
      
      await this.tagHandler.addTags(contentId, data.tags, env);
      return this.jsonResponse({ success: true });
    }
    
    // Handle tag management - remove tags
    if (path.match(/^\/api\/content\/[^/]+\/tags$/) && request.method === 'DELETE') {
      // Require authentication
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/')[3];
      const data = await request.json() as { tags: string[] };
      
      if (!Array.isArray(data.tags)) {
        return this.errorResponse('Invalid tags format');
      }
      
      await this.tagHandler.removeTags(contentId, data.tags, env);
      return this.jsonResponse({ success: true });
    }
    
    // Handle tag management - get content tags
    if (path.match(/^\/api\/content\/[^/]+\/tags$/) && request.method === 'GET') {
      const contentId = path.split('/')[3];
      const tags = await this.tagHandler.getContentTags(contentId, env);
      return this.jsonResponse({ tags });
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle drawer routes
   */
  private async handleDrawerRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Implement drawer routes
    return this.notFoundResponse();
  }
  
  /**
   * Handle association routes
   */
  private async handleAssociationRoutes(request: Request, env: Env, path: string): Promise<Response> {
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
    
    // Lurker search (randomized)
    if (path === '/api/search/lurker' && request.method === 'GET') {
      const url = new URL(request.url);
      const query = url.searchParams.get('q') || '';
      const randomness = parseInt(url.searchParams.get('randomness') || '50');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
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
      
      const results = await this.searchHandler.lurkerSearch(query, randomness, filters, limit, env);
      return this.jsonResponse(results);
    }
    
    // Popular tags
    if (path === '/api/search/tags' && request.method === 'GET') {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '30');
      
      const popularTags = await this.tagHandler.getPopularTags(limit, env);
      return this.jsonResponse(popularTags);
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Extract authentication token from request
   */
  private getAuthToken(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
  
  /**
   * Create a JSON response
   */
  private jsonResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
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
  
  /**
   * Handle CORS preflight requests
   */
  private handleCors(): Response {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
}
