#!/bin/bash
# Script to fix cookie handling in router.ts

# Backup the file first
cp src/router.ts src/router.ts.bak.$(date +%s)

# Create the updated file
cat > src/router.ts.tmp << 'EOF'
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
            redirectUrl: '/'
          });
        }
        
        // For direct browser requests, set cookies and redirect
        // Determine if we're in a secure context
        const domain = requestUrl.hostname;
        const isLocalhost = domain === 'localhost';
        
        // Set secure attribute based on environment (always for production, not for localhost)
        const secureFlag = isLocalhost ? '' : 'Secure; ';
        
        console.log('ORCID auth - Setting cookies:', { domain, isLocalhost, secureFlag });
        
        const headers = new Headers({
          'Location': '/',
          'Set-Cookie': `r3l_session=${authResult.token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`
        });
        
        // Add a secondary cookie that's accessible to JavaScript just to indicate auth state
        // This doesn't contain the actual token, just a flag that user is logged in
        headers.append('Set-Cookie', `r3l_auth_state=true; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`);
        
        // Add CORS headers
        headers.set('Access-Control-Allow-Origin', requestUrl.origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        
        return new Response(null, {
          status: 302,
          headers
        });
      } catch (error) {
        console.error('ORCID auth error:', error);
        
        // For API requests from the SPA, return JSON error
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse({ 
            success: false, 
            message: error instanceof Error ? error.message : 'Authentication failed' 
          }, 400);
        }
        
        // For direct browser requests, redirect
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `/login?error=${encodeURIComponent('Authentication failed')}`
          }
        });
      }
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
            redirectUrl: '/'
          });
        }
        
        // For direct browser requests, set cookies and redirect
        // Determine if we're in a secure context
        const domain = requestUrl.hostname;
        const isLocalhost = domain === 'localhost';
        
        // Set secure attribute based on environment (always for production, not for localhost)
        const secureFlag = isLocalhost ? '' : 'Secure; ';
        
        console.log('GitHub auth - Setting cookies:', { domain, isLocalhost, secureFlag });
        
        const headers = new Headers({
          'Location': '/',
          'Set-Cookie': `r3l_session=${authResult.token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`
        });
        
        // Add a secondary cookie that's accessible to JavaScript just to indicate auth state
        // This doesn't contain the actual token, just a flag that user is logged in
        headers.append('Set-Cookie', `r3l_auth_state=true; Path=/; Max-Age=2592000; SameSite=Lax; ${secureFlag}`);
        
        // Add CORS headers
        headers.set('Access-Control-Allow-Origin', requestUrl.origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        
        return new Response(null, {
          status: 302,
          headers
        });
EOF

# Get the rest of the file starting after the GitHub auth callback section
cat src/router.ts | sed -n '/headers.set('\''Access-Control-Allow-Credentials'\'', '\''true'\'');/,$ p' | tail -n +4 >> src/router.ts.tmp

# Replace the old file with the new one
mv src/router.ts.tmp src/router.ts

# Make the script executable
chmod +x src/router.ts

echo "Cookie handling fixed in router.ts"
