#!/bin/bash

# This script updates the main router to use the OpenAuth server
echo "Updating router to use OpenAuth server..."

# Create a backup of the router file
cp src/router.ts src/router.ts.bak

# Update the handleAuthRoutes method in the router
# This is a targeted update to just the auth routes

cat > router-patch.js << 'EOF'
const fs = require('fs');

// Read the router file
const routerPath = 'src/router.ts';
const content = fs.readFileSync(routerPath, 'utf8');

// Find the handleAuthRoutes method
const methodRegex = /private async handleAuthRoutes\(request: Request, env: Env, path: string\): Promise<Response> {[\s\S]+?return this\.notFoundResponse\(\);[\s\S]+?}/;
const method = content.match(methodRegex);

if (!method) {
  console.error('Could not find handleAuthRoutes method in router.ts');
  process.exit(1);
}

// Create the updated method
const updatedMethod = `private async handleAuthRoutes(request: Request, env: Env, path: string): Promise<Response> {
    if (ROUTE_DEBUG) console.log(\`[Router] Processing auth route: \${path}\`);
    
    // Forward authentication requests to the OpenAuth server
    if (path === '/api/auth/github/init' && request.method === 'GET') {
      // Forward to OpenAuth server
      try {
        const authUrl = new URL('/authorize', 'https://auth-service');
        authUrl.searchParams.set('client_id', 'your-client-id');
        authUrl.searchParams.set('redirect_uri', \`\${new URL(request.url).origin}/auth/github/callback\`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('provider', 'github');
        
        const response = await env.AUTH_SERVICE.fetch(authUrl.toString());
        
        if (!response.ok) {
          console.error('Failed to initialize GitHub auth:', response.statusText);
          return this.errorResponse(\`Failed to initialize GitHub auth: \${response.statusText}\`);
        }
        
        const data = await response.json();
        return this.jsonResponse({ authorizationUrl: data.authorizationUrl });
      } catch (error) {
        console.error('Error initializing GitHub auth:', error);
        return this.errorResponse('Failed to initialize GitHub authentication');
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
      
      try {
        // Forward to OpenAuth server
        const callbackUrl = new URL('/callback', 'https://auth-service');
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('provider', 'github');
        callbackUrl.searchParams.set('redirect_uri', \`\${requestUrl.origin}/auth/github/callback\`);
        
        const response = await env.AUTH_SERVICE.fetch(callbackUrl.toString());
        
        if (!response.ok) {
          console.error('Failed to complete GitHub auth:', response.statusText);
          return this.errorResponse(\`Failed to complete GitHub auth: \${response.statusText}\`);
        }
        
        const data = await response.json();
        
        // For API requests from the SPA, return JSON
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse({
            success: true,
            token: data.token,
            redirectUrl: '/'
          });
        }
        
        // For direct browser requests, set cookies and redirect
        const domain = requestUrl.hostname;
        const isSecure = isSecureRequest(request);
        
        // Create cookies with proper attributes using helper
        const headers = createAuthCookies(data.token, domain, isSecure);
        headers.set('Location', '/');
        
        // Add CORS headers if needed
        headers.set('Access-Control-Allow-Origin', requestUrl.origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        
        console.log('GitHub auth - Set cookies successfully with SameSite=' + (isSecure ? 'None' : 'Lax'));
        
        return new Response(null, {
          status: 302,
          headers
        });
      } catch (error) {
        console.error('GitHub auth error:', error);
        
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
            'Location': \`/login?error=\${encodeURIComponent('Authentication failed')}\`
          }
        });
      }
    }
    
    // Initialize ORCID auth (similar to GitHub)
    if (path === '/api/auth/orcid/init' && request.method === 'GET') {
      // Forward to OpenAuth server
      try {
        const authUrl = new URL('/authorize', 'https://auth-service');
        authUrl.searchParams.set('client_id', 'your-client-id');
        authUrl.searchParams.set('redirect_uri', \`\${new URL(request.url).origin}/auth/orcid/callback\`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('provider', 'orcid');
        
        const response = await env.AUTH_SERVICE.fetch(authUrl.toString());
        
        if (!response.ok) {
          console.error('Failed to initialize ORCID auth:', response.statusText);
          return this.errorResponse(\`Failed to initialize ORCID auth: \${response.statusText}\`);
        }
        
        const data = await response.json();
        return this.jsonResponse({ authorizationUrl: data.authorizationUrl });
      } catch (error) {
        console.error('Error initializing ORCID auth:', error);
        return this.errorResponse('Failed to initialize ORCID authentication');
      }
    }
    
    // Complete ORCID auth (similar to GitHub)
    if (path === '/api/auth/orcid/callback' && request.method === 'GET') {
      const requestUrl = new URL(request.url);
      const urlParams = requestUrl.searchParams;
      const code = urlParams.get('code');
      
      if (!code) {
        return this.errorResponse('Missing code parameter');
      }
      
      try {
        // Forward to OpenAuth server
        const callbackUrl = new URL('/callback', 'https://auth-service');
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('provider', 'orcid');
        callbackUrl.searchParams.set('redirect_uri', \`\${requestUrl.origin}/auth/orcid/callback\`);
        
        const response = await env.AUTH_SERVICE.fetch(callbackUrl.toString());
        
        if (!response.ok) {
          console.error('Failed to complete ORCID auth:', response.statusText);
          return this.errorResponse(\`Failed to complete ORCID auth: \${response.statusText}\`);
        }
        
        const data = await response.json();
        
        // Handle response similarly to GitHub
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse({
            success: true,
            token: data.token,
            redirectUrl: '/'
          });
        }
        
        const domain = requestUrl.hostname;
        const isSecure = isSecureRequest(request);
        const headers = createAuthCookies(data.token, domain, isSecure);
        headers.set('Location', '/');
        headers.set('Access-Control-Allow-Origin', requestUrl.origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        
        return new Response(null, {
          status: 302,
          headers
        });
      } catch (error) {
        console.error('ORCID auth error:', error);
        
        if (request.headers.get('Accept')?.includes('application/json')) {
          return this.jsonResponse({ 
            success: false, 
            message: error instanceof Error ? error.message : 'Authentication failed' 
          }, 400);
        }
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': \`/login?error=\${encodeURIComponent('Authentication failed')}\`
          }
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
      
      try {
        // Forward to OpenAuth server
        const validateUrl = new URL('/validate', 'https://auth-service');
        const response = await env.AUTH_SERVICE.fetch(validateUrl.toString(), {
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });
        
        if (!response.ok) {
          console.log('Validate endpoint - invalid token');
          return this.errorResponse('Invalid or expired token', 401);
        }
        
        const data = await response.json();
        console.log('Validate endpoint - valid token, user data:', data.user);
        
        // Set CORS headers for credentials
        const headers = new Headers({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        });
        
        return this.jsonResponse({ valid: true, user: data.user }, 200, headers);
      } catch (error) {
        console.error('Validate endpoint error:', error);
        return this.errorResponse('Authentication validation failed', 401);
      }
    }
    
    // Logout
    if (path === '/api/auth/logout' && request.method === 'POST') {
      const token = this.getAuthToken(request);
      if (token) {
        try {
          // Forward to OpenAuth server
          const logoutUrl = new URL('/logout', 'https://auth-service');
          await env.AUTH_SERVICE.fetch(logoutUrl.toString(), {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${token}\`
            }
          });
        } catch (error) {
          console.error('Logout error:', error);
          // Continue anyway to clear cookies
        }
      }
      
      // Clear cookies regardless of server response
      const domain = new URL(request.url).hostname;
      const isSecure = isSecureRequest(request);
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
  }`;

// Replace the old method with the updated one
const updatedContent = content.replace(methodRegex, updatedMethod);

// Write the updated file
fs.writeFileSync(routerPath, updatedContent);
console.log('Successfully updated router.ts');
EOF

# Run the script to update the router
node router-patch.js

# Clean up
rm router-patch.js

echo "Router updated to use OpenAuth server"
