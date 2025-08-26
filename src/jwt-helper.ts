/**
 * JWT Helper for R3L:F
 *
 * Handles JWT token generation, validation, and cookie management
 * Uses secure HttpOnly cookies and HMAC-SHA256 signing
 */

import { Env } from './types/env';
import { isSecureRequest } from './cookie-helper';

// JWT token structure
interface JWTPayload {
  sub: string; // Subject (user ID)
  name?: string; // User's name
  role?: string; // User's role
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
  jti: string; // JWT ID (unique token identifier)
}

/**
 * Generate a JWT token
 * @param userId User ID to include in the token
 * @param userName User name to include in the token (optional)
 * @param role User role (optional)
 * @param env Environment for accessing secrets
 * @param expiresIn Expiration time in seconds (default: 30 days)
 * @returns JWT token string
 */
export async function generateJWT(
  userId: string,
  userName?: string,
  role?: string,
  env?: Env,
  expiresIn: number = 30 * 24 * 60 * 60 // 30 days in seconds
): Promise<string> {
  // Get the current time
  const now = Math.floor(Date.now() / 1000);

  // Create JWT payload
  const payload: JWTPayload = {
    sub: userId,
    iat: now,
    exp: now + expiresIn,
    jti: crypto.randomUUID(),
  };

  // Add optional fields if provided
  if (userName) payload.name = userName;
  if (role) payload.role = role;

  // Create JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // Base64 encode header and payload
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));

  // Create signature base
  const signatureBase = `${encodedHeader}.${encodedPayload}`;

  // Get the JWT secret from environment or use a default for development
  const jwtSecret = env?.JWT_SECRET || 'r3l-development-jwt-secret-do-not-use-in-production';

  // Convert the secret to an ArrayBuffer for use with SubtleCrypto
  const encoder = new TextEncoder();
  const secretBuffer = encoder.encode(jwtSecret);

  // Create the key from the secret
  const key = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'HMAC' },
    key,
    encoder.encode(signatureBase)
  );

  // Convert signature to Base64
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  // Return the complete JWT token
  return `${signatureBase}.${signature}`;
}

/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @param env Environment for accessing secrets
 * @returns Payload if token is valid, null otherwise
 */
export async function verifyJWT(token: string, env?: Env): Promise<JWTPayload | null> {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('JWT verification failed: Invalid token format');
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Decode the payload first to check expiration before expensive signature verification
    let payload: JWTPayload;
    try {
      payload = JSON.parse(atob(encodedPayload)) as JWTPayload;
    } catch (e) {
      console.log('JWT verification failed: Invalid payload encoding');
      return null;
    }

    // Check if the token is expired
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp) {
      console.log('JWT verification failed: Missing expiration');
      return null;
    }

    if (payload.exp < now) {
      console.log('JWT verification failed: Token expired', {
        exp: new Date(payload.exp * 1000).toISOString(),
        now: new Date(now * 1000).toISOString(),
      });
      return null;
    }

    // Check if the token is used before it was issued (clock skew)
    if (payload.iat && payload.iat > now + 60) {
      // Allow 1 minute of clock skew
      console.log('JWT verification failed: Token used before issuance', {
        iat: new Date(payload.iat * 1000).toISOString(),
        now: new Date(now * 1000).toISOString(),
      });
      return null;
    }

    // Get the JWT secret from environment or use a default for development
    const jwtSecret = env?.JWT_SECRET || 'r3l-development-jwt-secret-do-not-use-in-production';

    // Convert the secret to an ArrayBuffer for use with SubtleCrypto
    const encoder = new TextEncoder();
    const secretBuffer = encoder.encode(jwtSecret);

    // Create the key from the secret
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert the signature from Base64 to ArrayBuffer
    const signatureBuffer = new Uint8Array(
      atob(signature)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      { name: 'HMAC' },
      key,
      signatureBuffer,
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );

    if (!isValid) {
      console.log('JWT verification failed: Invalid signature');
      return null;
    }

    // Return the validated payload
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Create an HttpOnly cookie with the JWT token
 * @param token JWT token
 * @param domain Domain for cookie
 * @param isSecure Whether the connection is secure (HTTPS)
 * @returns Headers object with Set-Cookie header
 */
export function createJWTCookie(token: string, domain: string, isSecure: boolean): Headers {
  // Set SameSite attribute based on connection security
  const sameSite = isSecure ? 'None' : 'Lax';

  // Build JWT cookie with all required attributes
  // Important: Must be HttpOnly to prevent JavaScript access
  let jwtCookieStr = `r3l_jwt=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=${sameSite}`;

  // Add Domain attribute except for localhost
  if (domain !== 'localhost' && !domain.startsWith('127.0.0.1')) {
    jwtCookieStr += `; Domain=${domain}`;
  }

  // Add Secure attribute for HTTPS
  if (isSecure) {
    jwtCookieStr += `; Secure`;
  }

  console.log(
    `JWT helper - Creating JWT cookie for domain: ${domain}, isSecure: ${isSecure}, sameSite: ${sameSite}`
  );
  console.log(`JWT helper - Cookie string: ${jwtCookieStr}`);

  // Create headers with cookie
  const headers = new Headers();
  headers.append('Set-Cookie', jwtCookieStr);

  // Add basic CORS headers
  headers.append('Access-Control-Allow-Credentials', 'true');

  return headers;
}

/**
 * Create headers to clear JWT cookie
 * @param domain Domain to clear cookie from
 * @param isSecure Whether the connection is secure (HTTPS)
 * @returns Headers with Set-Cookie for expired cookie
 */
export function clearJWTCookie(domain: string, isSecure: boolean): Headers {
  // Set SameSite attribute based on connection security
  const sameSite = isSecure ? 'None' : 'Lax';

  // Build JWT cookie clear string with all required attributes
  let clearJwtCookieStr = `r3l_jwt=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}`;

  // Add Domain attribute except for localhost
  if (domain !== 'localhost' && !domain.startsWith('127.0.0.1')) {
    clearJwtCookieStr += `; Domain=${domain}`;
  }

  // Add Secure attribute for HTTPS
  if (isSecure) {
    clearJwtCookieStr += `; Secure`;
  }

  console.log(`JWT helper - Clearing JWT cookie: ${clearJwtCookieStr}`);

  // Create headers with cleared cookie
  const headers = new Headers();
  headers.append('Set-Cookie', clearJwtCookieStr);

  return headers;
}

/**
 * Extract JWT token from cookie or Authorization header
 * @param request Request object to extract token from
 * @returns JWT token if found, null otherwise
 */
export function extractJWTFromRequest(request: Request): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check for token in cookie if not in header
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/r3l_jwt=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate a JWT and set it as an HttpOnly cookie
 * @param userId User ID to include in the token
 * @param request Request object to extract domain and security info
 * @param userName User name to include in the token (optional)
 * @param role User role (optional)
 * @param env Environment for accessing secrets
 * @returns Headers object with Set-Cookie header and the JWT token
 */
export async function generateJWTAndSetCookie(
  userId: string,
  request: Request,
  userName?: string,
  role?: string,
  env?: Env
): Promise<{ headers: Headers; token: string }> {
  // Generate JWT token
  const token = await generateJWT(userId, userName, role, env);

  // Extract domain and security info from request
  const url = new URL(request.url);
  const domain = url.hostname;
  const isSecure = isSecureRequest(request);

  // Create cookie headers
  const headers = createJWTCookie(token, domain, isSecure);

  return { headers, token };
}

/**
 * Helper function to test if the JWT is working correctly
 * @param request Request object
 * @param env Environment for accessing secrets
 * @returns Response with test results
 */
export async function testJWT(request: Request, env?: Env): Promise<Response> {
  const url = new URL(request.url);
  const domain = url.hostname;
  const isSecure = isSecureRequest(request);

  // Generate a test JWT
  const userId = crypto.randomUUID();
  const userName = 'Test User';
  const token = await generateJWT(userId, userName, 'user', env);

  // Create cookie
  const headers = createJWTCookie(token, domain, isSecure);

  // Verify the JWT we just created
  const verified = await verifyJWT(token, env);

  // Return test results
  return new Response(
    JSON.stringify({
      success: true,
      message: 'JWT test completed',
      jwt: {
        token: token.substring(0, 20) + '...',
        payload: {
          sub: userId,
          name: userName,
          verified: !!verified,
        },
      },
      domain,
      isSecure,
      sameSite: isSecure ? 'None' : 'Lax',
    }),
    {
      status: 200,
      headers,
    }
  );
}
