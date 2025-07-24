/**
 * A simplified helper to set cookies with proper attributes
 * @param token The session token to store in the cookie
 * @param domain The domain to set the cookie for (not currently used)
 * @param isSecure Whether the connection is HTTPS
 * @returns Headers object with Set-Cookie headers
 */
export function createAuthCookies(token: string, _domain: string, isSecure: boolean): Headers {
  // Create cookie attributes based on environment
  const sameSite = isSecure ? 'None' : 'Lax';
  const secureAttr = isSecure ? 'Secure' : '';
  
  // Configure cookies properly
  const sessionCookie = [
    `r3l_session=${token}`,
    'HttpOnly',
    'Path=/',
    'Max-Age=2592000', // 30 days
    `SameSite=${sameSite}`
  ];
  
  // Add Secure attribute if connection is HTTPS
  if (secureAttr) {
    sessionCookie.push(secureAttr);
  }
  
  // Create auth state cookie (accessible to JS)
  const authStateCookie = [
    'r3l_auth_state=true',
    'Path=/',
    'Max-Age=2592000', // 30 days
    `SameSite=${sameSite}`
  ];
  
  // Add Secure attribute if connection is HTTPS
  if (secureAttr) {
    authStateCookie.push(secureAttr);
  }
  
  // Create headers with both cookies
  const headers = new Headers({
    'Set-Cookie': sessionCookie.join('; ')
  });
  headers.append('Set-Cookie', authStateCookie.join('; '));
  
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
 * @param domain The domain to clear cookies from (not currently used)
 * @param isSecure Whether the connection is HTTPS
 * @returns Headers with Set-Cookie for expiring cookies
 */
export function createClearAuthCookies(_domain: string, isSecure: boolean): Headers {
  // Configure cookie attributes
  const sameSite = isSecure ? 'None' : 'Lax';
  const secureAttr = isSecure ? 'Secure' : '';
  
  // Expire session cookie
  const sessionCookie = [
    'r3l_session=',
    'HttpOnly',
    'Path=/',
    'Max-Age=0', // Expire immediately
    `SameSite=${sameSite}`
  ];
  
  // Add Secure attribute if connection is HTTPS
  if (secureAttr) {
    sessionCookie.push(secureAttr);
  }
  
  // Expire auth state cookie
  const authStateCookie = [
    'r3l_auth_state=',
    'Path=/',
    'Max-Age=0', // Expire immediately
    `SameSite=${sameSite}`
  ];
  
  // Add Secure attribute if connection is HTTPS
  if (secureAttr) {
    authStateCookie.push(secureAttr);
  }
  
  // Create headers with both expired cookies
  const headers = new Headers({
    'Set-Cookie': sessionCookie.join('; ')
  });
  headers.append('Set-Cookie', authStateCookie.join('; '));
  
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
