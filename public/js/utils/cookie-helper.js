/**
 * Cookie Helper Utility
 * Provides utilities for client-side cookie management and authentication state
 */

/**
 * Get a cookie value by name
 * @param {string} name The name of the cookie to retrieve
 * @returns {string|null} The cookie value or null if not found
 */
export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Check if the user is authenticated based on the auth state cookie
 * @returns {boolean} True if authenticated, false otherwise
 */
export function isAuthenticated() {
  return getCookie('r3l_auth_state') === 'true';
}

/**
 * Helper to run API fetches with proper credentials
 * @param {string} url The API URL to fetch
 * @param {object} options Fetch options (method, headers, etc.)
 * @returns {Promise<Response>} The fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  // Ensure credentials are always included
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Handle 401 Unauthorized by showing login prompt
    if (response.status === 401) {
      console.warn('Authentication required for API call:', url);
      // You could trigger a login prompt here if needed
    }
    
    return response;
  } catch (error) {
    console.error('API fetch error:', error, { url, options: fetchOptions });
    throw error;
  }
}

/**
 * Fix authentication cookies if needed
 * This can be called when authentication errors occur to try to fix cookie issues
 * @returns {Promise<boolean>} True if fixed successfully, false otherwise
 */
export async function fixAuthCookies() {
  try {
    const response = await fetch('/api/auth/fix-cookies', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('Auth cookies fixed successfully');
      return true;
    } else {
      console.warn('Failed to fix auth cookies:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error fixing auth cookies:', error);
    return false;
  }
}

/**
 * Clear authentication cookies (for logout)
 * @returns {Promise<boolean>} True if cleared successfully, false otherwise
 */
export async function clearAuthCookies() {
  try {
    const response = await fetch('/api/auth/jwt/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('Auth cookies cleared successfully');
      return true;
    } else {
      console.warn('Failed to clear auth cookies:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error clearing auth cookies:', error);
    return false;
  }
}