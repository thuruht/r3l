// Router.ts
// Main router for the R3L:F application
// Handles all API routes and static file serving

import { JWTAuthHandler } from './handlers/jwt-auth';
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
import { isSecureRequest } from './cookie-helper';
import { extractJWTFromRequest } from './jwt-helper';

// For debugging - log route processing
const ROUTE_DEBUG = false;

export class Router {
  private jwtAuthHandler: JWTAuthHandler;
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
    this.jwtAuthHandler = new JWTAuthHandler();
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
      const authenticatedUserId = token ? await this.jwtAuthHandler.validateToken(request, env) : null;
      
      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const search = url.searchParams.get('search') || '';
      
      // Instead of using listUsers which doesn't exist, we'll stub this
      // TODO: Implement a proper user listing method that supports pagination and search
      const users: any[] = [];
      return this.jsonResponse(users);
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle authentication routes
   */
  private async handleAuthRoutes(request: Request, env: Env, path: string): Promise<Response> {
    if (ROUTE_DEBUG) console.log(`[Router] Processing auth route: ${path}`);
    
    // Validate token (now only uses JWT auth)
    if (path === '/api/auth/validate' && request.method === 'GET') {
      // Check for token in auth header or cookies
      const userId = await this.jwtAuthHandler.validateToken(request, env);
      
      if (!userId) {
        console.log('Validate endpoint - invalid or missing token');
        return this.errorResponse('Invalid or expired token', 401);
      }
      
      console.log('Validate endpoint - valid token for user:', userId);
      const user = await this.userHandler.getUser(userId, env);
      
      // Set CORS headers for credentials
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      });
      
      return this.jsonResponse({ valid: true, user }, 200, headers);
    }
    
    // Logout (now only uses JWT auth)
    if (path === '/api/auth/logout' && request.method === 'POST') {
      const result = await this.jwtAuthHandler.logout(request, env);
      return this.jsonResponse({ success: true }, 200, result.headers);
    }
    
    // JWT Authentication routes
    
    // Login with username/password
    if (path === '/api/auth/jwt/login' && request.method === 'POST') {
      try {
        const { username, password } = await request.json() as { username: string; password: string };
        
        if (!username || !password) {
          return this.errorResponse('Username and password are required');
        }
        
        const result = await this.jwtAuthHandler.login(username, password, request, env);
        
        if (!result.success) {
          return this.errorResponse(result.message || 'Authentication failed', 401);
        }
        
        return this.jsonResponse({ 
          success: true, 
          userId: result.userId 
        }, 200, result.headers);
      } catch (error) {
        console.error('JWT login error:', error);
        return this.errorResponse('Invalid request format', 400);
      }
    }
    
    // Register new user
    if (path === '/api/auth/jwt/register' && request.method === 'POST') {
      try {
        const { 
          username, 
          password, 
          displayName, 
          email 
        } = await request.json() as { 
          username: string; 
          password: string; 
          displayName: string; 
          email: string;
        };
        
        if (!username || !password || !displayName) {
          return this.errorResponse('Username, password, and display name are required');
        }
        
        const result = await this.jwtAuthHandler.register(
          username, 
          password, 
          displayName, 
          email || '', 
          request, 
          env
        );
        
        if (!result.success) {
          return this.errorResponse(result.message || 'Registration failed', 400);
        }
        
        return this.jsonResponse({ 
          success: true, 
          userId: result.userId,
          recoveryKey: result.recoveryKey 
        }, 200, result.headers);
      } catch (error) {
        console.error('JWT register error:', error);
        return this.errorResponse('Invalid request format', 400);
      }
    }
    
    // Logout
    if (path === '/api/auth/jwt/logout' && request.method === 'POST') {
      const result = await this.jwtAuthHandler.logout(request, env);
      return this.jsonResponse({ success: true }, 200, result.headers);
    }
    
    // Validate JWT token
    if (path === '/api/auth/jwt/validate' && request.method === 'GET') {
      const userId = await this.jwtAuthHandler.validateToken(request, env);
      
      if (!userId) {
        return this.errorResponse('Invalid or expired token', 401);
      }
      
      const user = await this.userHandler.getUser(userId, env);
      
      // Set CORS headers for credentials
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      });
      
      return this.jsonResponse({ valid: true, user }, 200, headers);
    }
    
    // Test JWT endpoint
    if (path === '/api/auth/jwt/test' && request.method === 'GET') {
      return this.jwtAuthHandler.handleTestJWT(request, env);
    }
    
    // Get user profile with JWT token
    if (path === '/api/auth/jwt/profile' && request.method === 'GET') {
      return this.jwtAuthHandler.getProfile(request, env);
    }
    
    // Check if a username exists
    if (path === '/api/auth/jwt/check-username' && request.method === 'POST') {
      return this.jwtAuthHandler.checkUsername(request, env);
    }
    
    // Verify recovery key
    if (path === '/api/auth/jwt/verify-recovery-key' && request.method === 'POST') {
      return this.jwtAuthHandler.verifyRecoveryKey(request, env);
    }
    
    // Reset password with recovery key
    if (path === '/api/auth/jwt/reset-password' && request.method === 'POST') {
      return this.jwtAuthHandler.resetPassword(request, env);
    }
    
    // Generate new recovery key for authenticated user
    if (path === '/api/auth/jwt/generate-recovery-key' && request.method === 'POST') {
      return this.jwtAuthHandler.generateNewRecoveryKey(request, env);
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
      authenticatedUserId = await this.jwtAuthHandler.validateToken(request, env);
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
            params.push((Date.now() + (2 * 24 * 60 * 60 * 1000)).toString()); // 2 days from now
            break;
          case 'archived':
            query += ' AND is_archived = 1';
            break;
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit.toString(), offset.toString());
        
        const result = await env.R3L_DB.prepare(query).bind(...params).all();
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
        // Use the statistics handler to get user stats
        const stats = await this.statsHandler.getUserStats(userId, env);
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
      authenticatedUserId = await this.jwtAuthHandler.validateToken(request, env);
    }
    
    // Handle content routes
    return this.notFoundResponse();
  }
  
  /**
   * Handle stats routes
   */
  private async handleStatsRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Check for authenticated user
    const token = this.getAuthToken(request);
    let authenticatedUserId: string | null = null;
    
    if (token) {
      authenticatedUserId = await this.jwtAuthHandler.validateToken(request, env);
    }
    
    console.log(`Stats route requested: ${path}`);
    
    // System stats - admin only
    if (path === '/api/stats/system' && request.method === 'GET') {
      // TODO: Add admin check here
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const stats = await this.statsHandler.getSystemStats(env);
        return this.jsonResponse(stats);
      } catch (error) {
        console.error('Error fetching system stats:', error);
        return this.errorResponse('Failed to fetch system stats');
      }
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle notification routes
   */
  private async handleNotificationRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Check for unsupported methods or paths
    console.log(`Notification route requested: ${path}`);
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
  private async handleAIRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Check for unsupported methods or paths
    console.log(`AI route requested: ${path}`);
    return this.notFoundResponse();
  }
  
  /**
   * Handle file routes
   */
  private async handleFileRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Check for unsupported methods or paths
    console.log(`File route requested: ${path}`);
    return this.notFoundResponse();
  }
  
  /**
   * Handle globe routes
   */
  private async handleGlobeRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Check for unsupported methods or paths
    console.log(`Globe route requested: ${path}`);
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
        authenticatedUserId = await this.jwtAuthHandler.validateToken(request, env);
      }
      
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      // Check if required environment variables are set
      const checks = {
        jwt: {
          secret: !!env.JWT_SECRET
        },
        services: {
          db: true, // Always true as it's a required binding
          kv: true,
          r2: true,
        }
      };
      
      return this.jsonResponse({
        checks,
        timestamp: Date.now()
      });
    }
    
    // Cookie check endpoint
    if (path === '/api/debug/cookie-check' && request.method === 'GET') {
      const cookies = request.headers.get('Cookie') || '';
      
      // Extract cookies
      const cookieObj: {[key: string]: string} = {};
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
        isSecure: isSecureRequest(request)
      });
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle drawer routes
   */
  private async handleDrawerRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Get authenticated user
    const token = this.getAuthToken(request);
    let authenticatedUserId: string | null = null;
    
    if (token) {
      authenticatedUserId = await this.jwtAuthHandler.validateToken(request, env);
    }
    
    // Random drawer (public or for authenticated users)
    if (path === '/api/random-drawer' && request.method === 'GET') {
      if (!authenticatedUserId) {
        // For non-authenticated users, return a 401 so frontend can show demo data
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const randomDrawer = await this.drawerHandler.getRandomDrawer(env);
        return this.jsonResponse(randomDrawer);
      } catch (error) {
        console.error('Error fetching random drawer:', error);
        return this.errorResponse('Failed to fetch random drawer');
      }
    }
    
    // Get drawer by ID
    if (path.match(/^\/api\/drawer\/[^/]+$/) && request.method === 'GET') {
      const drawerId = path.split('/').pop() as string;
      
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const drawer = await this.drawerHandler.getDrawerById(drawerId, env);
        return this.jsonResponse(drawer);
      } catch (error) {
        console.error('Error fetching drawer:', error);
        return this.errorResponse('Failed to fetch drawer');
      }
    }
    
    // Get user drawers
    if (path === '/api/drawers/user' && request.method === 'GET') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const drawers = await this.drawerHandler.getUserDrawers(authenticatedUserId, env);
      return this.jsonResponse(drawers);
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle association routes
   */
  private async handleAssociationRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
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
        userId = await this.jwtAuthHandler.validateToken(request, env);
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
  private async handleStaticFiles(_request: Request, _env: Env, path: string): Promise<Response> {
    // Implement static file handling here
    console.log(`Static file requested: ${path}`);
    return new Response('Static file handling not implemented', { status: 501 });
  }
  
  /**
   * Extract authentication token from request
   * Supports only JWT tokens (legacy session cookie support removed)
   */
  private getAuthToken(request: Request): string | null {
    // Check Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // Check for JWT token in cookie
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const jwtMatch = cookieHeader.match(/r3l_jwt=([^;]+)/);
      if (jwtMatch) {
        return jwtMatch[1];
      }
    }
    
    return null;
  }
  
  /**
   * Create a JSON response
   */
  private jsonResponse(data: any, status: number = 200, customHeaders?: Headers): Response {
    const headers = customHeaders || new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    // Ensure Content-Type is set
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    return new Response(JSON.stringify(data), {
      status,
      headers
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
