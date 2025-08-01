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
import { MessagingHandler } from './handlers/messaging';
import { Env, FileUpload } from './types/env';
import { isSecureRequest } from './cookie-helper';
import { extractJWTFromRequest } from './jwt-helper';
import { createRateLimiters } from './middleware/rate-limiter';

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
  private messagingHandler: MessagingHandler;
  
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
    this.messagingHandler = new MessagingHandler();
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
    
    // Create rate limiters
    const rateLimiters = createRateLimiters(env);
    
    // Handle API routes
    if (path.startsWith('/api/')) {
      // Apply general API rate limit
      const rateLimitResponse = await rateLimiters.api(request);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
      
      // Apply specific rate limits for different API categories
      if (path.startsWith('/api/auth/')) {
        const authRateLimitResponse = await rateLimiters.auth(request);
        if (authRateLimitResponse) {
          return authRateLimitResponse;
        }
      } else if (path.startsWith('/api/content/') && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentRateLimitResponse = await rateLimiters.contentCreation(request);
        if (contentRateLimitResponse) {
          return contentRateLimitResponse;
        }
      } else if (path.startsWith('/api/files/') && request.method === 'POST') {
        const fileRateLimitResponse = await rateLimiters.fileUploads(request);
        if (fileRateLimitResponse) {
          return fileRateLimitResponse;
        }
      } else if (path.startsWith('/api/users/') || path.startsWith('/api/connections/')) {
        const userRateLimitResponse = await rateLimiters.userActions(request);
        if (userRateLimitResponse) {
          return userRateLimitResponse;
        }
      }
      
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
    
    if (path.startsWith('/api/notifications') || path === '/api/notifications') {
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
    
    if (path.startsWith('/api/messages/')) {
      return this.handleMessagingRoutes(request, env, path);
    }
    
    if (path.startsWith('/api/debug/')) {
      return this.handleDebugRoutes(request, env, path);
    }
    
    // List users
    if (path === '/api/users' && request.method === 'GET') {
      const authenticatedUserId = await this.getAuthenticatedUser(request, env);
      
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '12');
      const page = parseInt(url.searchParams.get('page') || '1');
      const offset = (page - 1) * limit;
      
      try {
        // Get total count of users (excluding the current user)
        const countQuery = `
          SELECT COUNT(*) as total
          FROM users
          WHERE id != ?
        `;
        
        const countResult = await env.R3L_DB.prepare(countQuery)
          .bind(authenticatedUserId)
          .first();
        
        const total = countResult ? (countResult.total as number) : 0;
        const totalPages = Math.ceil(total / limit);
        
        // Query users with pagination
        const query = `
          SELECT 
            id, 
            username, 
            display_name, 
            bio, 
            avatar_url,
            created_at,
            (SELECT COUNT(*) FROM content WHERE user_id = users.id) AS content_count,
            (SELECT COUNT(*) FROM connections WHERE 
              (user_id = users.id OR connected_user_id = users.id) 
              AND status = 'accepted' AND type = 'mutual'
            ) AS connection_count
          FROM users
          WHERE id != ?
          ORDER BY username ASC
          LIMIT ? OFFSET ?
        `;
        
        const result = await env.R3L_DB.prepare(query)
          .bind(authenticatedUserId, limit, offset)
          .all();
        
        const users = result.results || [];
        
        // For each user, determine the connection status with the current user
        const usersWithConnectionStatus = await Promise.all(users.map(async (user: any) => {
          const connectionStatus = await this.getUserConnectionStatus(authenticatedUserId, user.id, env);
          return {
            ...user,
            connectionStatus
          };
        }));
        
        return this.jsonResponse({
          users: usersWithConnectionStatus,
          page,
          totalPages,
          total
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        return this.errorResponse('Failed to fetch users');
      }
    }
    
    // Search users
    if (path === '/api/users/search' && request.method === 'GET') {
      const authenticatedUserId = await this.getAuthenticatedUser(request, env);
      
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      // Parse query parameters
      const url = new URL(request.url);
      const query = url.searchParams.get('query') || '';
      const filter = url.searchParams.get('filter') || 'all';
      const limit = parseInt(url.searchParams.get('limit') || '12');
      const page = parseInt(url.searchParams.get('page') || '1');
      const offset = (page - 1) * limit;
      
      try {
        let sqlQuery = '';
        let countQuery = '';
        let params: any[] = [];
        
        // Base query to search users
        if (query) {
          // Search by username or display name
          sqlQuery = `
            SELECT 
              id, 
              username, 
              display_name, 
              bio, 
              avatar_url,
              created_at,
              (SELECT COUNT(*) FROM content WHERE user_id = users.id) AS content_count,
              (SELECT COUNT(*) FROM connections WHERE 
                (user_id = users.id OR connected_user_id = users.id) 
                AND status = 'accepted' AND type = 'mutual'
              ) AS connection_count
            FROM users
            WHERE id != ? AND (
              username LIKE ? OR
              display_name LIKE ?
            )
          `;
          
          countQuery = `
            SELECT COUNT(*) as total
            FROM users
            WHERE id != ? AND (
              username LIKE ? OR
              display_name LIKE ?
            )
          `;
          
          params = [authenticatedUserId, `%${query}%`, `%${query}%`];
        } else {
          // Filter based on connection status
          switch (filter) {
            case 'connected':
              // Users the current user is connected to
              sqlQuery = `
                SELECT 
                  u.id, 
                  u.username, 
                  u.display_name, 
                  u.bio, 
                  u.avatar_url,
                  u.created_at,
                  (SELECT COUNT(*) FROM content WHERE user_id = u.id) AS content_count,
                  (SELECT COUNT(*) FROM connections WHERE 
                    (user_id = u.id OR connected_user_id = u.id) 
                    AND status = 'accepted' AND type = 'mutual'
                  ) AS connection_count
                FROM users u
                INNER JOIN connections c ON 
                  (c.user_id = ? AND c.connected_user_id = u.id) OR
                  (c.connected_user_id = ? AND c.user_id = u.id)
                WHERE c.status = 'accepted'
              `;
              
              countQuery = `
                SELECT COUNT(DISTINCT u.id) as total
                FROM users u
                INNER JOIN connections c ON 
                  (c.user_id = ? AND c.connected_user_id = u.id) OR
                  (c.connected_user_id = ? AND c.user_id = u.id)
                WHERE c.status = 'accepted'
              `;
              
              params = [authenticatedUserId, authenticatedUserId];
              break;
              
            case 'mutual':
              // Users with mutual connections
              sqlQuery = `
                SELECT 
                  u.id, 
                  u.username, 
                  u.display_name, 
                  u.bio, 
                  u.avatar_url,
                  u.created_at,
                  (SELECT COUNT(*) FROM content WHERE user_id = u.id) AS content_count,
                  (SELECT COUNT(*) FROM connections WHERE 
                    (user_id = u.id OR connected_user_id = u.id) 
                    AND status = 'accepted' AND type = 'mutual'
                  ) AS connection_count
                FROM users u
                WHERE u.id != ? AND EXISTS (
                  SELECT 1 FROM connections c1
                  INNER JOIN connections c2 ON 
                    (c1.connected_user_id = c2.user_id OR c1.connected_user_id = c2.connected_user_id)
                  WHERE 
                    c1.user_id = ? AND 
                    c2.user_id = u.id AND
                    c1.status = 'accepted' AND
                    c2.status = 'accepted'
                )
              `;
              
              countQuery = `
                SELECT COUNT(*) as total
                FROM users u
                WHERE u.id != ? AND EXISTS (
                  SELECT 1 FROM connections c1
                  INNER JOIN connections c2 ON 
                    (c1.connected_user_id = c2.user_id OR c1.connected_user_id = c2.connected_user_id)
                  WHERE 
                    c1.user_id = ? AND 
                    c2.user_id = u.id AND
                    c1.status = 'accepted' AND
                    c2.status = 'accepted'
                )
              `;
              
              params = [authenticatedUserId, authenticatedUserId];
              break;
              
            case 'pending':
              // Users with pending connection requests
              sqlQuery = `
                SELECT 
                  u.id, 
                  u.username, 
                  u.display_name, 
                  u.bio, 
                  u.avatar_url,
                  u.created_at,
                  (SELECT COUNT(*) FROM content WHERE user_id = u.id) AS content_count,
                  (SELECT COUNT(*) FROM connections WHERE 
                    (user_id = u.id OR connected_user_id = u.id) 
                    AND status = 'accepted' AND type = 'mutual'
                  ) AS connection_count
                FROM users u
                INNER JOIN connections c ON 
                  (c.user_id = ? AND c.connected_user_id = u.id) OR
                  (c.connected_user_id = ? AND c.user_id = u.id)
                WHERE c.status = 'pending'
              `;
              
              countQuery = `
                SELECT COUNT(DISTINCT u.id) as total
                FROM users u
                INNER JOIN connections c ON 
                  (c.user_id = ? AND c.connected_user_id = u.id) OR
                  (c.connected_user_id = ? AND c.user_id = u.id)
                WHERE c.status = 'pending'
              `;
              
              params = [authenticatedUserId, authenticatedUserId];
              break;
              
            case 'nearby':
              // Users with content near the current user's location
              sqlQuery = `
                SELECT 
                  u.id, 
                  u.username, 
                  u.display_name, 
                  u.bio, 
                  u.avatar_url,
                  u.created_at,
                  (SELECT COUNT(*) FROM content WHERE user_id = u.id) AS content_count,
                  (SELECT COUNT(*) FROM connections WHERE 
                    (user_id = u.id OR connected_user_id = u.id) 
                    AND status = 'accepted' AND type = 'mutual'
                  ) AS connection_count
                FROM users u
                INNER JOIN (
                  SELECT DISTINCT user_id FROM geo_points
                  WHERE user_id != ?
                  LIMIT 100
                ) g ON u.id = g.user_id
                WHERE u.id != ?
              `;
              
              countQuery = `
                SELECT COUNT(DISTINCT u.id) as total
                FROM users u
                INNER JOIN (
                  SELECT DISTINCT user_id FROM geo_points
                  WHERE user_id != ?
                  LIMIT 100
                ) g ON u.id = g.user_id
                WHERE u.id != ?
              `;
              
              params = [authenticatedUserId, authenticatedUserId];
              break;
              
            default:
              // All users
              sqlQuery = `
                SELECT 
                  id, 
                  username, 
                  display_name, 
                  bio, 
                  avatar_url,
                  created_at,
                  (SELECT COUNT(*) FROM content WHERE user_id = users.id) AS content_count,
                  (SELECT COUNT(*) FROM connections WHERE 
                    (user_id = users.id OR connected_user_id = users.id) 
                    AND status = 'accepted' AND type = 'mutual'
                  ) AS connection_count
                FROM users
                WHERE id != ?
              `;
              
              countQuery = `
                SELECT COUNT(*) as total
                FROM users
                WHERE id != ?
              `;
              
              params = [authenticatedUserId];
          }
        }
        
        // Add pagination
        sqlQuery += ' ORDER BY username ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        // Get total count
        const countResult = await env.R3L_DB.prepare(countQuery)
          .bind(...params.slice(0, -2))
          .first();
        
        const total = countResult ? (countResult.total as number) : 0;
        const totalPages = Math.ceil(total / limit);
        
        // Get users
        const result = await env.R3L_DB.prepare(sqlQuery)
          .bind(...params)
          .all();
        
        const users = result.results || [];
        
        // For each user, determine the connection status with the current user
        const usersWithConnectionStatus = await Promise.all(users.map(async (user: any) => {
          const connectionStatus = await this.getUserConnectionStatus(authenticatedUserId, user.id, env);
          return {
            ...user,
            connectionStatus
          };
        }));
        
        return this.jsonResponse({
          users: usersWithConnectionStatus,
          query,
          filter,
          page,
          totalPages,
          total
        });
      } catch (error) {
        console.error('Error searching users:', error);
        return this.errorResponse('Failed to search users');
      }
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
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    // Get current user profile
    if (path === '/api/users/me' && request.method === 'GET') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const user = await this.userHandler.getUser(authenticatedUserId, env);
      
      if (!user) {
        return this.errorResponse('User not found', 404);
      }
      
      return this.jsonResponse(user);
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
    // Get authenticated user first for permission checks
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    // Create new content
    if (path === '/api/content' && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const data = await request.json() as {
          title: string;
          description: string;
          type: string;
          category: string;
          tags: string[];
          isPublic: boolean;
          fileKey?: string;
          location?: {
            lat: number;
            lng: number;
            name?: string;
          };
        };
        
        if (!data.title || !data.type) {
          return this.errorResponse('Title and type are required');
        }
        
        const contentId = await this.contentHandler.createContent(
          authenticatedUserId,
          data,
          env
        );
        
        return this.jsonResponse({ id: contentId, success: true });
      } catch (error) {
        console.error('Error creating content:', error);
        return this.errorResponse('Failed to create content');
      }
    }
    
    // Get content tags
    if (path.match(/^\/api\/content\/[^/]+\/tags$/) && request.method === 'GET') {
      const contentId = path.split('/')[3];
      
      try {
        const query = `
          SELECT t.id, t.name
          FROM tags t
          JOIN content_tags ct ON t.id = ct.tag_id
          WHERE ct.content_id = ?
          ORDER BY t.name ASC
        `;
        
        const result = await env.R3L_DB.prepare(query)
          .bind(contentId)
          .all();
        
        const tags = result.results || [];
        
        return this.jsonResponse({
          contentId,
          tags
        });
      } catch (error) {
        console.error('Error fetching content tags:', error);
        return this.errorResponse('Failed to fetch content tags');
      }
    }
    
    // Get content by ID
    if (path.match(/^\/api\/content\/[^/]+$/) && request.method === 'GET') {
      const contentId = path.split('/').pop() as string;
      
      try {
        const content = await this.contentHandler.getContent(contentId, env);
        
        if (!content) {
          return this.errorResponse('Content not found', 404);
        }
        
        // Check if user can access this content
        const canAccess = await this.contentHandler.canAccessContent(
          contentId, 
          authenticatedUserId, 
          env
        );
        
        if (!canAccess) {
          return this.errorResponse('Unauthorized to access this content', 403);
        }
        
        // Get location data if available
        const location = await this.contentHandler.getContentLocation(contentId, env);
        
        return this.jsonResponse({
          ...content,
          location
        });
      } catch (error) {
        console.error('Error fetching content:', error);
        return this.errorResponse('Failed to fetch content');
      }
    }
    
    // Update content
    if (path.match(/^\/api\/content\/[^/]+$/) && request.method === 'PATCH') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/').pop() as string;
      
      try {
        const data = await request.json() as Partial<{
          title: string;
          description: string;
          category: string;
          tags: string[];
          isPublic: boolean;
        }>;
        
        await this.contentHandler.updateContent(
          contentId,
          authenticatedUserId,
          data,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error updating content:', error);
        
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return this.errorResponse('Unauthorized to update this content', 403);
        }
        
        return this.errorResponse('Failed to update content');
      }
    }
    
    // Delete content
    if (path.match(/^\/api\/content\/[^/]+$/) && request.method === 'DELETE') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/').pop() as string;
      
      try {
        await this.contentHandler.deleteContent(
          contentId,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error deleting content:', error);
        
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return this.errorResponse('Unauthorized to delete this content', 403);
        }
        
        return this.errorResponse('Failed to delete content');
      }
    }
    
    // Get recent content
    if (path === '/api/content/recent' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        const content = await this.contentHandler.getRecentContent(
          limit,
          offset,
          env,
          authenticatedUserId || undefined
        );
        
        return this.jsonResponse(content);
      } catch (error) {
        console.error('Error fetching recent content:', error);
        return this.errorResponse('Failed to fetch recent content');
      }
    }
    
    // Archive content personally
    if (path.match(/^\/api\/content\/[^/]+\/archive$/) && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/')[3];
      
      try {
        await this.contentHandler.archiveContentPersonally(
          contentId,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error archiving content:', error);
        
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return this.errorResponse('Unauthorized to archive this content', 403);
        }
        
        return this.errorResponse('Failed to archive content');
      }
    }
    
    // Vote for community archive
    if (path.match(/^\/api\/content\/[^/]+\/vote-archive$/) && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/')[3];
      
      try {
        const voteCount = await this.contentHandler.voteForCommunityArchive(
          contentId,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ success: true, votes: voteCount });
      } catch (error) {
        console.error('Error voting for archive:', error);
        
        if (error instanceof Error && error.message.includes('Already voted')) {
          return this.errorResponse('Already voted for this content', 400);
        }
        
        return this.errorResponse('Failed to vote for archive');
      }
    }
    
    // Record download and count as archive vote
    if (path.match(/^\/api\/content\/[^/]+\/download$/) && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/')[3];
      
      try {
        await this.contentHandler.recordDownload(
          contentId,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error recording download:', error);
        return this.errorResponse('Failed to record download');
      }
    }
    
    // Copy content to drawer
    if (path.match(/^\/api\/content\/[^/]+\/copy-to-drawer$/) && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const contentId = path.split('/')[3];
      
      try {
        const data = await request.json() as { isPublic?: boolean };
        const isPublic = !!data.isPublic;
        
        const copyId = await this.contentHandler.copyToDrawer(
          contentId,
          authenticatedUserId,
          isPublic,
          env
        );
        
        return this.jsonResponse({ success: true, id: copyId });
      } catch (error) {
        console.error('Error copying to drawer:', error);
        
        if (error instanceof Error && error.message.includes('Cannot access')) {
          return this.errorResponse('Cannot access this content', 403);
        }
        
        return this.errorResponse('Failed to copy to drawer');
      }
    }
    
    // Get random communique
    if (path === '/api/content/random' && request.method === 'GET') {
      try {
        const content = await this.contentHandler.getRandomCommunique(env);
        
        if (!content) {
          return this.errorResponse('No content found', 404);
        }
        
        return this.jsonResponse(content);
      } catch (error) {
        console.error('Error fetching random communique:', error);
        return this.errorResponse('Failed to fetch random communique');
      }
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle stats routes
   */
  private async handleStatsRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Check for authenticated user
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    console.log(`Stats route requested: ${path}`);
    
    // System stats - admin only
    if (path === '/api/stats/system' && request.method === 'GET') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      // Check if user is an admin
      const isAdmin = await env.R3L_DB.prepare(`
        SELECT is_admin FROM users WHERE id = ?
      `).bind(authenticatedUserId).first();
      
      if (!isAdmin || !isAdmin.is_admin) {
        return this.errorResponse('Admin privileges required', 403);
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
    // Check for authenticated user
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    if (!authenticatedUserId) {
      return this.errorResponse('Authentication required', 401);
    }
    
    // Get user's notifications
    if (path === '/api/notifications' && request.method === 'GET') {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      
      const notifications = await this.notificationHandler.getUserNotifications(
        authenticatedUserId,
        limit,
        offset,
        env
      );
      
      return this.jsonResponse(notifications);
    }
    
    // Get unread notification count
    if (path === '/api/notifications/unread-count' && request.method === 'GET') {
      const count = await this.notificationHandler.getUnreadCount(authenticatedUserId, env);
      return this.jsonResponse({ count });
    }
    
    // Mark notifications as read
    if (path === '/api/notifications/mark-read' && request.method === 'POST') {
      try {
        const data = await request.json() as { ids: string[] };
        
        if (!Array.isArray(data.ids)) {
          return this.errorResponse('Invalid request format', 400);
        }
        
        await this.notificationHandler.markAsRead(authenticatedUserId, data.ids, env);
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error marking notifications as read:', error);
        return this.errorResponse('Invalid request format', 400);
      }
    }
    
    // Mark all notifications as read
    if (path === '/api/notifications/mark-all-read' && request.method === 'POST') {
      await this.notificationHandler.markAllAsRead(authenticatedUserId, env);
      return this.jsonResponse({ success: true });
    }
    
    // Delete a notification
    if (path.match(/^\/api\/notifications\/[^/]+$/) && request.method === 'DELETE') {
      const notificationId = path.split('/').pop() as string;
      
      await this.notificationHandler.deleteNotification(
        authenticatedUserId,
        notificationId,
        env
      );
      
      return this.jsonResponse({ success: true });
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle tag routes
   */
  private async handleTagRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
    return this.notFoundResponse();
  }
  
  /**
   * Handle messaging routes
   */
  private async handleMessagingRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Check for authenticated user
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    if (!authenticatedUserId) {
      return this.errorResponse('Authentication required', 401);
    }
    
    // Get user's conversations
    if (path === '/api/messages/conversations' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        const conversations = await this.messagingHandler.getUserConversations(
          authenticatedUserId,
          env,
          limit,
          offset
        );
        
        return this.jsonResponse(conversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return this.errorResponse('Failed to fetch conversations');
      }
    }
    
    // Get messages from a conversation
    if (path.match(/^\/api\/messages\/conversations\/[^/]+$/) && request.method === 'GET') {
      try {
        const conversationId = path.split('/').pop() as string;
        
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const before = url.searchParams.get('before') || undefined;
        
        const messages = await this.messagingHandler.getConversationMessages(
          authenticatedUserId,
          conversationId,
          env,
          limit,
          before
        );
        
        return this.jsonResponse(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        return this.errorResponse('Failed to fetch messages');
      }
    }
    
    // Send a message
    if (path === '/api/messages/send' && request.method === 'POST') {
      try {
        const { recipientId, content, attachments } = await request.json() as {
          recipientId: string;
          content: string;
          attachments?: string[];
        };
        
        if (!recipientId || !content) {
          return this.errorResponse('Recipient ID and content are required');
        }
        
        const result = await this.messagingHandler.sendMessage(
          authenticatedUserId,
          recipientId,
          content,
          attachments || [],
          env
        );
        
        return this.jsonResponse(result);
      } catch (error) {
        console.error('Error sending message:', error);
        return this.errorResponse('Failed to send message');
      }
    }
    
    // Delete a message
    if (path.match(/^\/api\/messages\/[^/]+$/) && request.method === 'DELETE') {
      try {
        const messageId = path.split('/').pop() as string;
        
        await this.messagingHandler.deleteMessage(
          authenticatedUserId,
          messageId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error deleting message:', error);
        return this.errorResponse('Failed to delete message');
      }
    }
    
    // Mark conversation as read
    if (path.match(/^\/api\/messages\/conversations\/[^/]+\/read$/) && request.method === 'POST') {
      try {
        const conversationId = path.split('/')[3];
        
        await this.messagingHandler.markConversationAsRead(
          authenticatedUserId,
          conversationId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error marking conversation as read:', error);
        return this.errorResponse('Failed to mark conversation as read');
      }
    }
    
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
    // Get file from R2 storage
    if (path.match(/^\/api\/files\/[^/]+/) && request.method === 'GET') {
      const fileKey = path.replace('/api/files/', '');
      return this.fileHandler.getFile(fileKey, env);
    }
    
    // Upload avatar image - requires authentication
    if (path === '/api/files/avatar' && request.method === 'POST') {
      const authenticatedUserId = await this.getAuthenticatedUser(request, env);
      
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        // Check if this is a multipart form request
        const contentType = request.headers.get('Content-Type') || '';
        
        if (!contentType.includes('multipart/form-data')) {
          return this.errorResponse('Invalid request format. Expected multipart/form-data.', 400);
        }
        
        // Parse the multipart form data
        const formData = await request.formData();
        const fileEntry = formData.get('file');
        
        if (!fileEntry) {
          return this.errorResponse('No file provided', 400);
        }
        
        if (typeof fileEntry === 'string') {
          return this.errorResponse('Invalid file format', 400);
        }
        
        // Cast to our custom FileUpload type for TypeScript
        const file = fileEntry as unknown as FileUpload;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          return this.errorResponse('Only image files are allowed for avatars', 400);
        }
        
        // Get file data
        const fileData = await file.arrayBuffer();
        
        // Upload avatar
        const result = await this.fileHandler.uploadAvatar(
          authenticatedUserId,
          fileData,
          file.name,
          file.type,
          env
        );
        
        return this.jsonResponse({
          success: true,
          avatarKey: result.avatarKey,
          avatarUrl: result.avatarUrl
        });
      } catch (error) {
        console.error('Error uploading avatar:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
        return this.errorResponse(errorMessage, 500);
      }
    }
    
    // Upload generic file - requires authentication
    if (path === '/api/files/upload' && request.method === 'POST') {
      const authenticatedUserId = await this.getAuthenticatedUser(request, env);
      
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        // Check if this is a multipart form request
        const contentType = request.headers.get('Content-Type') || '';
        
        if (!contentType.includes('multipart/form-data')) {
          return this.errorResponse('Invalid request format. Expected multipart/form-data.', 400);
        }
        
        // Parse the multipart form data
        const formData = await request.formData();
        const fileEntry = formData.get('file');
        const metadata = formData.get('metadata') as string;
        
        if (!fileEntry) {
          return this.errorResponse('No file provided', 400);
        }
        
        if (typeof fileEntry === 'string') {
          return this.errorResponse('Invalid file format', 400);
        }
        
        // Cast to our custom FileUpload type for TypeScript
        const file = fileEntry as unknown as FileUpload;
        
        // Parse metadata if provided
        let parsedMetadata: { [key: string]: string } = {
          userId: authenticatedUserId
        };
        
        if (metadata) {
          try {
            const jsonMetadata = JSON.parse(metadata);
            parsedMetadata = { ...parsedMetadata, ...jsonMetadata };
          } catch (e) {
            console.warn('Invalid metadata JSON, using default metadata');
          }
        }
        
        // Get file data
        const fileData = await file.arrayBuffer();
        
        // Upload file
        const result = await this.fileHandler.uploadFile(
          fileData,
          file.name,
          file.type || 'application/octet-stream',
          parsedMetadata,
          env
        );
        
        return this.jsonResponse({
          success: true,
          key: result.key,
          url: result.url
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        return this.errorResponse('Failed to upload file', 500);
      }
    }
    
    // Delete file - requires authentication
    if (path.match(/^\/api\/files\/[^/]+/) && request.method === 'DELETE') {
      const authenticatedUserId = await this.getAuthenticatedUser(request, env);
      
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const fileKey = path.replace('/api/files/', '');
        
        // Check file ownership before deleting
        const fileDetails = await env.R3L_DB.prepare(`
          SELECT user_id FROM content WHERE file_key = ?
        `).bind(fileKey).first();
        
        // Check if user owns the file or has admin privileges
        if (fileDetails && fileDetails.user_id !== authenticatedUserId) {
          // Check if user is an admin
          const isAdmin = await env.R3L_DB.prepare(`
            SELECT is_admin FROM users WHERE id = ?
          `).bind(authenticatedUserId).first();
          
          if (!isAdmin || !isAdmin.is_admin) {
            return this.errorResponse('Not authorized to delete this file', 403);
          }
        }
        
        const success = await this.fileHandler.deleteFile(fileKey, env);
        
        if (!success) {
          return this.errorResponse('Failed to delete file', 500);
        }
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error deleting file:', error);
        return this.errorResponse('Failed to delete file', 500);
      }
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle globe routes
   */
  private async handleGlobeRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Get authenticated user first for permission checks
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    // Get map data points - both public and private for authenticated users
    if (path === '/api/globe/data-points' && request.method === 'GET') {
      try {
        // Extract query parameters
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const bboxParam = url.searchParams.get('bbox');
        
        let bbox = null;
        if (bboxParam) {
          const [minLng, minLat, maxLng, maxLat] = bboxParam.split(',').map(Number);
          bbox = { minLng, minLat, maxLng, maxLat };
        }
        
        // If user is authenticated, get both public and private points
        // Otherwise only get public points
        const dataPoints = await this.globeHandler.getDataPoints(
          limit,
          bbox,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse(dataPoints);
      } catch (error) {
        console.error('Error fetching globe data points:', error);
        return this.errorResponse('Failed to fetch map data');
      }
    }
    
    // Get a specific point's details
    if (path.match(/^\/api\/globe\/points\/[^/]+$/) && request.method === 'GET') {
      try {
        const pointId = path.split('/').pop() as string;
        
        // Get the point with associated content
        const point = await this.globeHandler.getPointById(
          pointId,
          authenticatedUserId,
          env
        );
        
        if (!point) {
          return this.errorResponse('Point not found', 404);
        }
        
        return this.jsonResponse(point);
      } catch (error) {
        console.error('Error fetching point details:', error);
        return this.errorResponse('Failed to fetch point details');
      }
    }
    
    // Add a new data point - requires authentication
    if (path === '/api/globe/points' && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const data = await request.json() as any;
        
        if (!data.latitude || !data.longitude) {
          return this.errorResponse('Latitude and longitude are required');
        }
        
        const point = await this.globeHandler.addDataPoint(
          authenticatedUserId,
          data,
          env
        );
        
        return this.jsonResponse(point);
      } catch (error) {
        console.error('Error adding data point:', error);
        return this.errorResponse('Failed to add data point');
      }
    }
    
    // Update a data point - requires authentication and ownership
    if (path.match(/^\/api\/globe\/points\/[^/]+$/) && request.method === 'PATCH') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const pointId = path.split('/').pop() as string;
        const data = await request.json() as any;
        
        // Check if user owns this point
        const point = await this.globeHandler.getPointById(
          pointId,
          authenticatedUserId,
          env
        );
        
        if (!point) {
          return this.errorResponse('Point not found', 404);
        }
        
        if (point.userId !== authenticatedUserId) {
          return this.errorResponse('Unauthorized', 403);
        }
        
        const updatedPoint = await this.globeHandler.updateDataPoint(
          pointId,
          data,
          env
        );
        
        return this.jsonResponse(updatedPoint);
      } catch (error) {
        console.error('Error updating data point:', error);
        return this.errorResponse('Failed to update data point');
      }
    }
    
    // Delete a data point - requires authentication and ownership
    if (path.match(/^\/api\/globe\/points\/[^/]+$/) && request.method === 'DELETE') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const pointId = path.split('/').pop() as string;
        
        // Check if user owns this point
        const point = await this.globeHandler.getPointById(
          pointId,
          authenticatedUserId,
          env
        );
        
        if (!point) {
          return this.errorResponse('Point not found', 404);
        }
        
        if (point.userId !== authenticatedUserId) {
          return this.errorResponse('Unauthorized', 403);
        }
        
        await this.globeHandler.deleteDataPoint(
          pointId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error deleting data point:', error);
        return this.errorResponse('Failed to delete data point');
      }
    }
    
    // If we got here, the route doesn't exist
    return this.notFoundResponse();
  }
  
  /**
   * Handle debug routes
   */
  private async handleDebugRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Environment check endpoint
    if (path === '/api/debug/env-check' && request.method === 'GET') {
      // Get authenticated user first - require authentication for this endpoint
      const authenticatedUserId = await this.getAuthenticatedUser(request, env);
      
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
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    // Random drawer (public or for authenticated users)
    if ((path === '/api/drawer/random' || path === '/api/random-drawer') && request.method === 'GET') {
      try {
        if (!authenticatedUserId) {
          // For non-authenticated users, return a 401 so frontend can show demo data
          return this.errorResponse('Authentication required', 401);
        }
        
        const randomDrawer = await this.drawerHandler.getRandomDrawer(env);
        return this.jsonResponse(randomDrawer);
      } catch (error) {
        console.error('Error fetching random drawer:', error);
        return this.errorResponse('Failed to fetch random drawer');
      }
    }
    
    // Create a new drawer
    if (path === '/api/drawer' && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const data = await request.json() as {
          name: string;
          description: string;
          isPublic: boolean;
        };
        
        if (!data.name) {
          return this.errorResponse('Drawer name is required');
        }
        
        const drawerId = await this.drawerHandler.createDrawer(
          authenticatedUserId,
          data.name,
          data.description || '',
          !!data.isPublic,
          env
        );
        
        return this.jsonResponse({ id: drawerId, success: true });
      } catch (error) {
        console.error('Error creating drawer:', error);
        return this.errorResponse('Failed to create drawer');
      }
    }
    
    // Get drawer by ID
    if (path.match(/^\/api\/drawer\/[^/]+$/) && request.method === 'GET') {
      const drawerId = path.split('/').pop() as string;
      
      try {
        // Get the drawer
        const drawer = await this.drawerHandler.getDrawer(drawerId, env);
        
        if (!drawer) {
          return this.errorResponse('Drawer not found', 404);
        }
        
        // Check access - if it's private, only the owner can access it
        if (!drawer.is_public && (!authenticatedUserId || drawer.user_id !== authenticatedUserId)) {
          return this.errorResponse('Unauthorized to access this drawer', 403);
        }
        
        // Get drawer contents
        const contents = await this.drawerHandler.getDrawerContents(drawerId, env);
        
        return this.jsonResponse({
          drawer,
          contents
        });
      } catch (error) {
        console.error('Error fetching drawer:', error);
        return this.errorResponse('Failed to fetch drawer');
      }
    }
    
    // Get drawer by user ID
    if (path.match(/^\/api\/drawer\/user\/[^/]+$/) && request.method === 'GET') {
      const userId = path.split('/').pop() as string;
      
      try {
        const drawer = await this.drawerHandler.getDrawerById(userId, env);
        return this.jsonResponse(drawer);
      } catch (error) {
        console.error('Error fetching user drawer:', error);
        return this.errorResponse('Failed to fetch user drawer');
      }
    }
    
    // Update drawer
    if (path.match(/^\/api\/drawer\/[^/]+$/) && request.method === 'PATCH') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const drawerId = path.split('/').pop() as string;
      
      try {
        // Check ownership
        const drawer = await this.drawerHandler.getDrawer(drawerId, env);
        
        if (!drawer) {
          return this.errorResponse('Drawer not found', 404);
        }
        
        if (drawer.user_id !== authenticatedUserId) {
          return this.errorResponse('Unauthorized to update this drawer', 403);
        }
        
        const data = await request.json() as {
          name?: string;
          description?: string;
          isPublic?: boolean;
        };
        
        await this.drawerHandler.updateDrawer(
          drawerId,
          data,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error updating drawer:', error);
        return this.errorResponse('Failed to update drawer');
      }
    }
    
    // Delete drawer
    if (path.match(/^\/api\/drawer\/[^/]+$/) && request.method === 'DELETE') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const drawerId = path.split('/').pop() as string;
      
      try {
        await this.drawerHandler.deleteDrawer(
          drawerId,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error deleting drawer:', error);
        
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return this.errorResponse('Unauthorized to delete this drawer', 403);
        }
        
        return this.errorResponse('Failed to delete drawer');
      }
    }
    
    // Get all user drawers
    if (path === '/api/drawer/user' && request.method === 'GET') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      try {
        const drawers = await this.drawerHandler.getUserDrawers(authenticatedUserId, env);
        return this.jsonResponse(drawers);
      } catch (error) {
        console.error('Error fetching user drawers:', error);
        return this.errorResponse('Failed to fetch user drawers');
      }
    }
    
    // Get public drawers
    if (path === '/api/drawer/public' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        const drawers = await this.drawerHandler.getPublicDrawers(limit, offset, env);
        return this.jsonResponse(drawers);
      } catch (error) {
        console.error('Error fetching public drawers:', error);
        return this.errorResponse('Failed to fetch public drawers');
      }
    }
    
    // Add content to drawer
    if (path.match(/^\/api\/drawer\/[^/]+\/content$/) && request.method === 'POST') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const drawerId = path.split('/')[3];
      
      try {
        const data = await request.json() as {
          contentId: string;
          note?: string;
        };
        
        if (!data.contentId) {
          return this.errorResponse('Content ID is required');
        }
        
        const drawerContentId = await this.drawerHandler.addContentToDrawer(
          drawerId,
          data.contentId,
          data.note || '',
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ id: drawerContentId, success: true });
      } catch (error) {
        console.error('Error adding content to drawer:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('Unauthorized')) {
            return this.errorResponse('Unauthorized to modify this drawer', 403);
          } else if (error.message.includes('already in drawer')) {
            return this.errorResponse('Content already in drawer', 400);
          }
        }
        
        return this.errorResponse('Failed to add content to drawer');
      }
    }
    
    // Remove content from drawer
    if (path.match(/^\/api\/drawer\/[^/]+\/content\/[^/]+$/) && request.method === 'DELETE') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const drawerId = path.split('/')[3];
      const contentId = path.split('/')[5];
      
      try {
        await this.drawerHandler.removeContentFromDrawer(
          drawerId,
          contentId,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error removing content from drawer:', error);
        
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return this.errorResponse('Unauthorized to modify this drawer', 403);
        }
        
        return this.errorResponse('Failed to remove content from drawer');
      }
    }
    
    // Update content note in drawer
    if (path.match(/^\/api\/drawer\/content\/[^/]+\/note$/) && request.method === 'PATCH') {
      if (!authenticatedUserId) {
        return this.errorResponse('Authentication required', 401);
      }
      
      const drawerContentId = path.split('/')[3];
      
      try {
        const data = await request.json() as { note: string };
        
        if (data.note === undefined) {
          return this.errorResponse('Note is required');
        }
        
        await this.drawerHandler.updateDrawerContentNote(
          drawerContentId,
          data.note,
          authenticatedUserId,
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error updating drawer content note:', error);
        
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return this.errorResponse('Unauthorized to modify this drawer content', 403);
        }
        
        return this.errorResponse('Failed to update drawer content note');
      }
    }
    
    // Find drawers containing a specific content
    if (path.match(/^\/api\/drawer\/find-with-content\/[^/]+$/) && request.method === 'GET') {
      const contentId = path.split('/').pop() as string;
      
      try {
        const url = new URL(request.url);
        const includePrivate = url.searchParams.get('include_private') === 'true';
        
        const drawers = await this.drawerHandler.findDrawersWithContent(
          contentId,
          includePrivate,
          env,
          authenticatedUserId || undefined
        );
        
        return this.jsonResponse(drawers);
      } catch (error) {
        console.error('Error finding drawers with content:', error);
        return this.errorResponse('Failed to find drawers with content');
      }
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Handle association routes
   */
  private async handleAssociationRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Get authenticated user for permissions
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    // Check if authenticated
    if (!authenticatedUserId) {
      return this.errorResponse('Authentication required', 401);
    }
    
    // Handle connection routes
    if (path.startsWith('/api/connections/')) {
      return this.handleConnectionRoutes(request, env, path, authenticatedUserId);
    }
    
    // Implement other association routes here
    
    return this.notFoundResponse();
  } // Added missing closing brace
  
  /**
   * Handle connection routes
   */
  private async handleConnectionRoutes(request: Request, env: Env, path: string, userId: string): Promise<Response> {
    // Create connection request
    if (path === '/api/connections/request' && request.method === 'POST') {
      try {
        const { userId: targetUserId, connectionType, message } = await request.json() as {
          userId: string;
          connectionType: 'mutual' | 'follow' | 'lurk';
          message?: string;
        };
        
        if (!targetUserId) {
          return this.errorResponse('Target user ID is required');
        }
        
        if (!['mutual', 'follow', 'lurk'].includes(connectionType)) {
          return this.errorResponse('Invalid connection type');
        }
        
        // Check if connection already exists
        const existingConnection = await this.getConnection(userId, targetUserId, env);
        
        if (existingConnection) {
          return this.errorResponse('Connection already exists', 400);
        }
        
        // Create the connection request
        const status = connectionType === 'mutual' ? 'pending' : 'accepted';
        const timestamp = Date.now();
        
        const query = `
          INSERT INTO connections (
            id,
            user_id,
            connected_user_id,
            type,
            status,
            message,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const connectionId = crypto.randomUUID();
        
        await env.R3L_DB.prepare(query).bind(
          connectionId,
          userId,
          targetUserId,
          connectionType,
          status,
          message || '',
          timestamp,
          timestamp
        ).run();
        
        // If mutual connection, create notification for target user
        if (connectionType === 'mutual') {
          // Create notification for target user
          await this.notificationHandler.createNotification(
            targetUserId,
            'connection',
            `New connection request`,
            `${userId} has sent you a connection request`,
            JSON.stringify({ userId, connectionId }),
            env
          );
        }
        
        return this.jsonResponse({
          success: true,
          id: connectionId,
          status
        });
      } catch (error) {
        console.error('Error creating connection request:', error);
        return this.errorResponse('Failed to create connection request');
      }
    }
    
    // Accept connection request
    if (path.match(/^\/api\/connections\/[^/]+$/) && request.method === 'GET') {
      try {
        const otherUserId = path.split('/').pop() as string;
        
        // Get the connection
        const connection = await this.getConnection(userId, otherUserId, env);
        
        if (!connection) {
          return this.jsonResponse({ exists: false });
        }
        
        return this.jsonResponse({
          exists: true,
          connection
        });
      } catch (error) {
        console.error('Error fetching connection:', error);
        return this.errorResponse('Failed to fetch connection');
      }
    }
    
    // Get connection network data
    if (path === '/api/connections/network' && request.method === 'GET') {
      try {
        // Fetch a network of connections within 2 degrees of separation
        const query = `
          WITH user_connections AS (
            -- Direct connections of the user
            SELECT 
              user_id, 
              connected_user_id,
              'direct' as connection_type,
              created_at
            FROM connections
            WHERE 
              (user_id = ? OR connected_user_id = ?) 
              AND status = 'accepted' 
              AND type = 'mutual'
            
            UNION
            
            -- Second-degree connections (connections of connections)
            SELECT 
              c2.user_id,
              c2.connected_user_id,
              'second-degree' as connection_type,
              c2.created_at
            FROM connections c1
            JOIN connections c2 ON 
              (c1.connected_user_id = c2.user_id OR c1.connected_user_id = c2.connected_user_id OR
               c1.user_id = c2.user_id OR c1.user_id = c2.connected_user_id)
            WHERE 
              ((c1.user_id = ? OR c1.connected_user_id = ?) AND
               c1.user_id != c2.user_id AND
               c1.user_id != c2.connected_user_id AND
               c1.connected_user_id != c2.user_id AND
               c1.connected_user_id != c2.connected_user_id)
              AND c1.status = 'accepted' 
              AND c1.type = 'mutual'
              AND c2.status = 'accepted'
              AND c2.type = 'mutual'
          )
          SELECT DISTINCT
            user_id,
            connected_user_id,
            connection_type,
            created_at
          FROM user_connections
          ORDER BY created_at DESC
          LIMIT 100
        `;
        
        const result = await env.R3L_DB.prepare(query)
          .bind(userId, userId, userId, userId)
          .all();
        
        const connections = result.results || [];
        
        return this.jsonResponse({
          connections
        });
      } catch (error) {
        console.error('Error fetching connection network:', error);
        return this.errorResponse('Failed to fetch connection network');
      }
    }
    
    // Remove connection
    if (path.match(/^\/api\/connections\/[^/]+$/) && request.method === 'DELETE') {
      try {
        const otherUserId = path.split('/').pop() as string;
        
        // Delete the connection
        const query = `
          DELETE FROM connections
          WHERE 
            (user_id = ? AND connected_user_id = ?) OR
            (user_id = ? AND connected_user_id = ?)
        `;
        
        await env.R3L_DB.prepare(query)
          .bind(userId, otherUserId, otherUserId, userId)
          .run();
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error removing connection:', error);
        return this.errorResponse('Failed to remove connection');
      }
    }
    
    // Accept connection request
    if (path.match(/^\/api\/connections\/request\/[^/]+\/accept$/) && request.method === 'POST') {
      try {
        const requestUserId = path.split('/')[3];
        
        // Find the connection request
        const query = `
          SELECT * FROM connections
          WHERE user_id = ? AND connected_user_id = ? AND status = 'pending'
        `;
        
        const result = await env.R3L_DB.prepare(query)
          .bind(requestUserId, userId)
          .first();
        
        if (!result) {
          return this.errorResponse('Connection request not found', 404);
        }
        
        // Update the connection status
        const updateQuery = `
          UPDATE connections
          SET status = 'accepted', updated_at = ?
          WHERE user_id = ? AND connected_user_id = ?
        `;
        
        await env.R3L_DB.prepare(updateQuery)
          .bind(Date.now(), requestUserId, userId)
          .run();
        
        // Create notification for the request sender
        await this.notificationHandler.createNotification(
          requestUserId,
          'connection',
          `Connection request accepted`,
          `${userId} has accepted your connection request`,
          JSON.stringify({ userId }),
          env
        );
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error accepting connection request:', error);
        return this.errorResponse('Failed to accept connection request');
      }
    }
    
    // Decline connection request
    if (path.match(/^\/api\/connections\/request\/[^/]+\/decline$/) && request.method === 'POST') {
      try {
        const requestUserId = path.split('/')[3];
        
        // Find the connection request
        const query = `
          DELETE FROM connections
          WHERE user_id = ? AND connected_user_id = ? AND status = 'pending'
        `;
        
        await env.R3L_DB.prepare(query)
          .bind(requestUserId, userId)
          .run();
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error declining connection request:', error);
        return this.errorResponse('Failed to decline connection request');
      }
    }
    
    // Get all connections
    if (path === '/api/connections' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const type = url.searchParams.get('type') || 'all';
        const status = url.searchParams.get('status') || 'accepted';
        
        let query = `
          SELECT 
            c.*,
            u.username as connected_username,
            u.display_name as connected_display_name,
            u.avatar_url as connected_avatar_url
          FROM connections c
          JOIN users u ON 
            CASE
              WHEN c.user_id = ? THEN u.id = c.connected_user_id
              WHEN c.connected_user_id = ? THEN u.id = c.user_id
            END
          WHERE 
            (c.user_id = ? OR c.connected_user_id = ?)
        `;
        
        const params = [userId, userId, userId, userId];
        
        // Filter by type
        if (type !== 'all') {
          query += ' AND c.type = ?';
          params.push(type);
        }
        
        // Filter by status
        if (status !== 'all') {
          query += ' AND c.status = ?';
          params.push(status);
        }
        
        query += ' ORDER BY c.updated_at DESC';
        
        const result = await env.R3L_DB.prepare(query)
          .bind(...params)
          .all();
        
        const connections = result.results || [];
        
        // Transform connections to include direction
        const transformedConnections = connections.map((conn: any) => {
          const isOutgoing = conn.user_id === userId;
          return {
            id: conn.id,
            type: conn.type,
            status: conn.status,
            message: conn.message,
            createdAt: conn.created_at,
            updatedAt: conn.updated_at,
            isOutgoing,
            otherUserId: isOutgoing ? conn.connected_user_id : conn.user_id,
            otherUser: {
              id: isOutgoing ? conn.connected_user_id : conn.user_id,
              username: conn.connected_username,
              displayName: conn.connected_display_name,
              avatarUrl: conn.connected_avatar_url
            }
          };
        });
        
        return this.jsonResponse(transformedConnections);
      } catch (error) {
        console.error('Error fetching connections:', error);
        return this.errorResponse('Failed to fetch connections');
      }
    }
    
    // Get connection with specific user
    if (path.match(/^\/api\/connections\/[^/]+$/) && request.method === 'GET') {
      try {
        const otherUserId = path.split('/').pop() as string;
        
        const connection = await this.getConnection(userId, otherUserId, env);
        
        if (!connection) {
          return this.jsonResponse({ exists: false });
        }
        
        return this.jsonResponse({
          exists: true,
          connection
        });
      } catch (error) {
        console.error('Error fetching connection:', error);
        return this.errorResponse('Failed to fetch connection');
      }
    }
    
    // Remove connection
    if (path.match(/^\/api\/connections\/[^/]+$/) && request.method === 'DELETE') {
      try {
        const otherUserId = path.split('/').pop() as string;
        
        // Delete the connection
        const query = `
          DELETE FROM connections
          WHERE 
            (user_id = ? AND connected_user_id = ?) OR
            (user_id = ? AND connected_user_id = ?)
        `;
        
        await env.R3L_DB.prepare(query)
          .bind(userId, otherUserId, otherUserId, userId)
          .run();
        
        return this.jsonResponse({ success: true });
      } catch (error) {
        console.error('Error removing connection:', error);
        return this.errorResponse('Failed to remove connection');
      }
    }
    
    return this.notFoundResponse();
  }
  
  /**
   * Get connection between two users
   */
  private async getConnection(userId: string, otherUserId: string, env: Env): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM connections
        WHERE 
          (user_id = ? AND connected_user_id = ?) OR
          (user_id = ? AND connected_user_id = ?)
      `;
      
      const result = await env.R3L_DB.prepare(query)
        .bind(userId, otherUserId, otherUserId, userId)
        .first();
      
      if (!result) {
        return null;
      }
      
      const connection = result as any;
      const isOutgoing = connection.user_id === userId;
      
      return {
        id: connection.id,
        type: connection.type,
        status: connection.status,
        message: connection.message,
        createdAt: connection.created_at,
        updatedAt: connection.updated_at,
        isOutgoing
      };
    } catch (error) {
      console.error('Error getting connection:', error);
      return null;
    }
  }
  
  /**
   * Get connection status between authenticated user and another user
   */
  private async getUserConnectionStatus(userId: string, otherUserId: string, env: Env): Promise<string> {
    try {
      const connection = await this.getConnection(userId, otherUserId, env);
      
      if (!connection) {
        return 'none';
      }
      
      if (connection.status === 'pending') {
        return connection.isOutgoing ? 'pending_outgoing' : 'pending_incoming';
      }
      
      if (connection.status === 'accepted') {
        if (connection.type === 'mutual') {
          return 'mutual';
        } else if (connection.type === 'follow') {
          return connection.isOutgoing ? 'following' : 'followed_by';
        } else if (connection.type === 'lurk') {
          return connection.isOutgoing ? 'lurking' : 'lurked_by';
        }
      }
      
      return 'none';
    } catch (error) {
      console.error('Error getting connection status:', error);
      return 'none';
    }
  }
  
  /**
   * Handle search routes
   */
  private async handleSearchRoutes(request: Request, env: Env, path: string): Promise<Response> {
    // Get authenticated user for permissions
    const authenticatedUserId = await this.getAuthenticatedUser(request, env);
    
    // Basic search
    if (path === '/api/search' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const query = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        // Parse filters
        const type = url.searchParams.getAll('type');
        const category = url.searchParams.getAll('category');
        const dateStart = url.searchParams.get('date_start');
        const dateEnd = url.searchParams.get('date_end');
        
        const filters: any = {};
        if (type.length > 0) filters.type = type;
        if (category.length > 0) filters.category = category;
        if (dateStart || dateEnd) {
          filters.dateRange = {};
          if (dateStart) filters.dateRange.start = parseInt(dateStart);
          if (dateEnd) filters.dateRange.end = parseInt(dateEnd);
        }
        
        // Set visibility based on authentication
        if (authenticatedUserId) {
          filters.userId = authenticatedUserId;
          filters.visibility = 'both'; // Include both public and private content owned by the user
          
          // Check if user has lurker mode enabled
          const user = await this.userHandler.getUser(authenticatedUserId, env);
          if (user && user.preferences.lurkerModeEnabled) {
            // If lurker mode is enabled, use lurker search instead
            const results = await this.searchHandler.lurkerSearch(
              query,
              user.preferences.lurkerModeRandomness,
              filters,
              limit,
              env
            );
            
            return this.jsonResponse({
              query,
              results,
              total: results.length,
              hasMore: results.length === limit,
              lurkerMode: true
            });
          }
        } else {
          filters.visibility = 'public'; // Only public content for non-authenticated users
        }
        
        const results = await this.searchHandler.basicSearch(
          query, 
          filters, 
          limit, 
          offset, 
          env
        );
        
        return this.jsonResponse({
          query,
          results,
          total: results.length,
          hasMore: results.length === limit
        });
      } catch (error) {
        console.error('Error performing search:', error);
        return this.errorResponse('Failed to perform search');
      }
    }
    
    // Lurker search (randomized results)
    if (path === '/api/search/lurker' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const query = url.searchParams.get('q') || '';
        const randomness = parseInt(url.searchParams.get('randomness') || '50');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        // Parse filters
        const type = url.searchParams.getAll('type');
        const category = url.searchParams.getAll('category');
        const dateStart = url.searchParams.get('date_start');
        const dateEnd = url.searchParams.get('date_end');
        
        const filters: any = {};
        if (type.length > 0) filters.type = type;
        if (category.length > 0) filters.category = category;
        if (dateStart || dateEnd) {
          filters.dateRange = {};
          if (dateStart) filters.dateRange.start = parseInt(dateStart);
          if (dateEnd) filters.dateRange.end = parseInt(dateEnd);
        }
        
        const results = await this.searchHandler.lurkerSearch(
          query,
          randomness,
          filters,
          limit,
          env
        );
        
        return this.jsonResponse({
          query,
          randomness,
          results,
          total: results.length
        });
      } catch (error) {
        console.error('Error performing lurker search:', error);
        return this.errorResponse('Failed to perform lurker search');
      }
    }
    
    // Location search
    if (path === '/api/search/location' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const lat = parseFloat(url.searchParams.get('lat') || '0');
        const lng = parseFloat(url.searchParams.get('lng') || '0');
        const radius = parseFloat(url.searchParams.get('radius') || '5');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        if (isNaN(lat) || isNaN(lng)) {
          return this.errorResponse('Valid latitude and longitude are required');
        }
        
        const results = await this.searchHandler.locationSearch(
          lat,
          lng,
          radius,
          limit,
          0, // Default randomness to 0
          env
        );
        
        return this.jsonResponse({
          location: { lat, lng },
          radius,
          results,
          total: results.length
        });
      } catch (error) {
        console.error('Error performing location search:', error);
        return this.errorResponse('Failed to perform location search');
      }
    }
    
    // Tag search
    if (path === '/api/search/tags' && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const query = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '15');
        
        // Get authenticated user for permissions
        const authenticatedUserId = await this.getAuthenticatedUser(request, env);
        
        let sql = `
          SELECT 
            t.id,
            t.name,
            COUNT(ct.content_id) as count
          FROM tags t
          LEFT JOIN content_tags ct ON t.id = ct.tag_id
        `;
        
        const params = [];
        
        // If there's a search query
        if (query) {
          sql += ` WHERE t.name LIKE ? `;
          params.push(`%${query}%`);
        }
        
        // If not authenticated, only include public content
        if (!authenticatedUserId) {
          sql += params.length > 0 ? ' AND ' : ' WHERE ';
          sql += `
            (ct.content_id IS NULL OR EXISTS (
              SELECT 1 FROM content c 
              WHERE c.id = ct.content_id AND c.visibility = 'public'
            ))
          `;
        }
        
        // Group by tag and sort by usage count
        sql += `
          GROUP BY t.id, t.name
          ORDER BY count DESC, t.name ASC
          LIMIT ?
        `;
        
        params.push(limit);
        
        const result = await env.R3L_DB.prepare(sql).bind(...params).all();
        const tags = result.results || [];
        
        return this.jsonResponse({
          query,
          tags,
          total: tags.length
        });
      } catch (error) {
        console.error('Error performing tag search:', error);
        return this.errorResponse('Failed to perform tag search');
      }
    }
    
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
   * Get authenticated user from request
   * @param request The HTTP request
   * @param env Environment bindings
   * @returns User ID if authenticated, null otherwise
   */
  private async getAuthenticatedUser(request: Request, env: Env): Promise<string | null> {
    const token = this.getAuthToken(request);
    if (!token) return null;
    
    return await this.jwtAuthHandler.validateToken(request, env);
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
