#!/bin/bash
# A comprehensive cookie handling fix script

# Backup the file first
cp src/router.ts src/router.ts.bak.$(date +%s)

echo "Fixing router.ts cookie handling..."

# Fix the circular reference in cookie options
sed -i 's/const cookieOptions = isLocalhost[^;]*$/const cookieOptions = isLocalhost ? "Path=\/; Max-Age=2592000; SameSite=Lax" : "Path=\/; Max-Age=2592000; SameSite=Lax; Secure";/' src/router.ts

# Fix the duplicate block in the GitHub auth handler
sed -i '/        return new Response(null, {/,/        });/ {
  /^          status: 302,$/d
  /^          headers$/d
  /^        });$/d
}' src/router.ts

# Add debug logging to validate token method
sed -i '/  async validateToken(token: string, env: Env): Promise<string | null> {/a\    console.log("AuthHandler - validateToken called with token length:", token ? token.length : 0);' src/router.ts

# Add more debug for completeOrcidAuth and completeGitHubAuth
sed -i '/  async completeOrcidAuth(/a\    console.log("ORCID auth - starting auth flow with code:", code?.substring(0, 5) + "...");' src/router.ts
sed -i '/  async completeGitHubAuth(/a\    console.log("GitHub auth - starting auth flow with code:", code?.substring(0, 5) + "...");' src/router.ts

# Print success message
echo "Cookie handling fixes applied to router.ts"

# Update getAuthToken method to also check r3l_auth_state
sed -i '/  private getAuthToken(request: Request): string | null {/,/    return null;/ {
  /    return null;/i\
    // If we got here and still don\x27t have a token, but we have the auth state cookie,\
    // the session cookie might have been lost or not set correctly.\
    const cookieHeader = request.headers.get(\x27Cookie\x27);\
    if (cookieHeader && cookieHeader.includes(\x27r3l_auth_state=true\x27)) {\
      console.log(\x27Found auth state cookie but no session cookie - auth state mismatch\x27);\
    }
}' src/router.ts

echo "Updated getAuthToken method to check auth state cookie"

# Create a proper debug endpoint to check auth status and cookies
ROUTE_DEBUG=$(cat << 'EOF'
    // Debug endpoint to check environment and auth status
    if (path === '/api/debug/env-check' && request.method === 'GET') {
      const cookieHeader = request.headers.get('Cookie') || '';
      const token = this.getAuthToken(request);
      const hasCookie = cookieHeader.includes('r3l_session=');
      const hasAuthState = cookieHeader.includes('r3l_auth_state=true');
      
      return this.jsonResponse({
        message: 'Environment check',
        cookieHeader: cookieHeader.length > 0 ? cookieHeader.length + ' chars' : 'empty',
        hasCookie,
        hasAuthState,
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });
    }
    
    // Endpoint to fix auth state cookie
    if (path === '/api/auth/fix-cookie' && request.method === 'GET') {
      return this.fixAuthStateCookie(request);
    }
EOF
)

# Insert the debug routes before auth routes
sed -i '/private async handleAuthRoutes/,/    if (path ===/s/    if (path ===/${ROUTE_DEBUG}\n\n    if (path ===/' src/router.ts

echo "Added debug endpoints for auth status"

# Update route method to check domain and set cookies correctly
sed -i '/  async route(request: Request, env: Env): Promise<Response> {/a\    // Log the domain\n    const requestUrl = new URL(request.url);\n    console.log(`Request domain: ${requestUrl.hostname}, is secure: ${requestUrl.protocol === "https:"}, URL: ${request.url}`);\n    const cookieHeader = request.headers.get("Cookie");\n    if (cookieHeader) {\n      console.log(`Cookie header length: ${cookieHeader.length}, includes session: ${cookieHeader.includes("r3l_session")}, includes auth_state: ${cookieHeader.includes("r3l_auth_state")}`);\n    } else {\n      console.log("No cookie header found");\n    }' src/router.ts

echo "Added request domain and cookie logging"

# Final message
echo "All cookie handling fixes applied successfully."
