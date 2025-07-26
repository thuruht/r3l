/**
 * A simplified helper to set cookies with proper attributes
 * @param token The session token to store in the cookie
 * @param domain The domain to set the cookie for
 * @param isSecure Whether the connection is HTTPS
 * @returns Headers object with Set-Cookie headers
 */
export function createAuthCookies(token: string, domain: string, isSecure: boolean): Headers {
  // Create cookie attributes based on environment
  // CRITICAL: Always use proper SameSite attribute
  // - For secure connections (HTTPS): SameSite=None; Secure
  // - For non-secure connections: SameSite=Lax
  const sameSite = isSecure ? 'None' : 'Lax';
  
  console.log(`Cookie helper - Creating cookies for domain: ${domain}, isSecure: ${isSecure}, sameSite: ${sameSite}`);
  
  // Build session cookie with all required attributes
  // SessionCookie must be HttpOnly (not accessible to JavaScript)
  let sessionCookieStr = `r3l_session=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=${sameSite}`;
  
  // Add Domain attribute except for localhost
  if (domain !== 'localhost' && !domain.startsWith('127.0.0.1')) {
    sessionCookieStr += `; Domain=${domain}`;
  }
  
  // Add Secure attribute for HTTPS
  if (isSecure) {
    sessionCookieStr += `; Secure`;
  }
  
  // Auth state cookie (accessible to JavaScript)
  let authStateCookieStr = `r3l_auth_state=true; Path=/; Max-Age=2592000; SameSite=${sameSite}`;
  
  // Add Domain attribute except for localhost
  if (domain !== 'localhost' && !domain.startsWith('127.0.0.1')) {
    authStateCookieStr += `; Domain=${domain}`;
  }
  
  // Add Secure attribute for HTTPS
  if (isSecure) {
    authStateCookieStr += `; Secure`;
  }
  
  console.log(`Cookie helper - Session cookie: ${sessionCookieStr}`);
  console.log(`Cookie helper - Auth state cookie: ${authStateCookieStr}`);
  
  // Create headers with both cookies using append
  const headers = new Headers();
  
  // CRITICAL: Order matters - session cookie must be set first
  headers.append('Set-Cookie', sessionCookieStr);
  headers.append('Set-Cookie', authStateCookieStr);
  
  // Add basic CORS headers
  headers.append('Access-Control-Allow-Credentials', 'true');
  
  // Add debugging info
  console.log('Cookie helper - Header count:', headers.get('Set-Cookie') ? '1+' : '0');
  console.log('Cookie helper - Set-Cookie:', headers.get('Set-Cookie'));
  
  return headers;
}

/**
 * Helper to create auth cookies for a successful login
 * @param token The session token
 * @param domain The domain to set the cookie for
 * @param isSecure Whether the connection is HTTPS
 * @returns Headers with Set-Cookie and redirect
 */
export function createAuthCookiesWithRedirect(
  token: string, 
  domain: string, 
  isSecure: boolean,
  redirectUrl: string = '/'
): Headers {
  const headers = createAuthCookies(token, domain, isSecure);
  headers.set('Location', redirectUrl);
  return headers;
}

/**
 * Create headers to clear auth cookies
 * @param domain The domain to clear cookies from
 * @param isSecure Whether the connection is HTTPS
 * @returns Headers with Set-Cookie for expiring cookies
 */
export function createClearAuthCookies(domain: string, isSecure: boolean): Headers {
  // Configure cookie attributes
  const sameSite = isSecure ? 'None' : 'Lax';
  
  console.log(`Cookie helper - Clearing cookies for domain: ${domain}, isSecure: ${isSecure}`);
  
  // Build session cookie clear string with all required attributes
  let clearSessionCookieStr = `r3l_session=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}`;
  
  // Add Domain attribute except for localhost
  if (domain !== 'localhost' && !domain.startsWith('127.0.0.1')) {
    clearSessionCookieStr += `; Domain=${domain}`;
  }
  
  // Add Secure attribute for HTTPS
  if (isSecure) {
    clearSessionCookieStr += `; Secure`;
  }
  
  // Build auth state cookie clear string
  let clearAuthStateCookieStr = `r3l_auth_state=; Path=/; Max-Age=0; SameSite=${sameSite}`;
  
  // Add Domain attribute except for localhost
  if (domain !== 'localhost' && !domain.startsWith('127.0.0.1')) {
    clearAuthStateCookieStr += `; Domain=${domain}`;
  }
  
  // Add Secure attribute for HTTPS
  if (isSecure) {
    clearAuthStateCookieStr += `; Secure`;
  }
  
  console.log(`Cookie helper - Clearing session cookie: ${clearSessionCookieStr}`);
  console.log(`Cookie helper - Clearing auth state cookie: ${clearAuthStateCookieStr}`);
  
  // Create headers with both cleared cookies
  const headers = new Headers();
  headers.append('Set-Cookie', clearSessionCookieStr);
  headers.append('Set-Cookie', clearAuthStateCookieStr);
  
  return headers;
}

/**
 * Get the domain name from a URL, safely
 * @param url The URL to extract the domain from
 * @returns Domain name (hostname)
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    // Default to localhost if URL parsing fails
    console.error('Failed to parse URL:', url);
    return 'localhost';
  }
}

/**
 * Check if a domain is localhost
 * @param domain Domain name to check
 * @returns Whether the domain is localhost
 */
export function isLocalhost(domain: string): boolean {
  return domain === 'localhost' || domain.startsWith('127.0.0.1');
}

/**
 * Helper function to check if a request is secure (HTTPS)
 * @param request The request object
 * @returns Whether the connection is secure
 */
export function isSecureRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    // Check if protocol is https:
    return url.protocol === 'https:';
  } catch (e) {
    // Default to false if URL parsing fails
    console.error('Failed to parse request URL:', request.url);
    return false;
  }
}
