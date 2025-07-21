/**
 * Auth Helper Library
 * 
 * Provides consistent auth handling functions across the application.
 * Includes extensive debug logging that can be controlled via URL parameter.
 */

// Enable debug mode via URL parameter ?debug-auth
const DEBUG_MODE = new URLSearchParams(window.location.search).has('debug-auth');

/**
 * Get cookie value by name
 * @param {string} name The cookie name
 * @returns {string|null} The cookie value or null if not found
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Log debug message to console
 * @param {string} source The source of the message (e.g., 'AuthHelper')
 * @param {string} message The message to log
 * @param {any} data Optional data to log
 */
function debugLog(source, message, data = null) {
  if (!DEBUG_MODE) return;
  
  const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
  const prefix = `[${timestamp}] [${source}] `;
  
  if (data) {
    console.log(prefix + message, data);
  } else {
    console.log(prefix + message);
  }
}

/**
 * Check if the user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
function isAuthenticated() {
  const authState = getCookie('r3l_auth_state');
  const hasSession = !!getCookie('r3l_session');
  
  debugLog('AuthHelper', `isAuthenticated check - Auth state: ${authState}, Has session: ${hasSession}`);
  debugLog('AuthHelper', `Current cookies: ${document.cookie}`);
  
  return authState === 'true' && hasSession;
}

/**
 * Validate the authentication with the server
 * @returns {Promise<Object|null>} The user object if validated, null otherwise
 */
async function validateAuth() {
  try {
    debugLog('AuthHelper', 'Validating authentication with server');
    
    const response = await fetch('/api/auth/validate', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    debugLog('AuthHelper', `Validation response status: ${response.status}`);
    
    if (!response.ok) {
      debugLog('AuthHelper', 'Authentication validation failed', { status: response.status });
      return null;
    }
    
    const data = await response.json();
    debugLog('AuthHelper', 'Authentication validated successfully', data);
    
    return data.user || null;
  } catch (error) {
    debugLog('AuthHelper', 'Error validating authentication', error);
    return null;
  }
}

/**
 * Logout the user
 * @returns {Promise<boolean>} True if logout was successful
 */
async function logout() {
  try {
    debugLog('AuthHelper', 'Logging out user');
    
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    debugLog('AuthHelper', `Logout response status: ${response.status}`);
    
    // Clear cookies client-side as well
    document.cookie = 'r3l_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'r3l_auth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    debugLog('AuthHelper', 'Cookies cleared after logout');
    return true;
  } catch (error) {
    debugLog('AuthHelper', 'Error during logout', error);
    return false;
  }
}

/**
 * Initialize authentication on page load
 * @param {Function} onAuthenticated Callback when user is authenticated
 * @param {Function} onUnauthenticated Callback when user is not authenticated
 */
function initAuth(onAuthenticated = null, onUnauthenticated = null) {
  debugLog('AuthHelper', 'Initializing authentication');
  
  if (isAuthenticated()) {
    debugLog('AuthHelper', 'User appears to be authenticated via cookies, validating with server');
    
    validateAuth().then(user => {
      if (user && onAuthenticated) {
        debugLog('AuthHelper', 'User validated, executing authenticated callback');
        onAuthenticated(user);
      } else if (!user && onUnauthenticated) {
        debugLog('AuthHelper', 'User not validated, executing unauthenticated callback');
        onUnauthenticated();
      }
    });
  } else if (onUnauthenticated) {
    debugLog('AuthHelper', 'User is not authenticated, executing unauthenticated callback');
    onUnauthenticated();
  }
}

// Export the functions
export {
  getCookie,
  debugLog,
  isAuthenticated,
  validateAuth,
  logout,
  initAuth
};
