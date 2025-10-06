/**
 * Secure API Helper Utility
 * Uses HttpOnly cookies for authentication instead of localStorage
 */

/**
 * Checks if the user is authenticated by checking for session cookie
 * @returns {boolean} True if session cookie exists
 */
function isAuthenticated() {
  return document.cookie.includes('r3l_session=');
}

/**
 * Secure fetch wrapper that includes credentials for cookie-based auth
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function authenticatedFetch(url, options = {}) {
  const finalOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, finalOptions);
    
    if (response.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/auth/login.html?message=' + encodeURIComponent('Please log in to continue');
      return response;
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Logout by clearing session cookie
 */
function logout() {
  // Clear the session cookie by setting it to expire
  document.cookie = 'r3l_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  window.location.href = '/auth/login.html?message=' + encodeURIComponent('You have been logged out');
}

// API endpoints for modular backend
const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/register',
    LOGIN: '/api/login',
    LOGOUT: '/api/logout',
    PROFILE: '/api/auth/profile',
  },
  CONTENT: {
    GET: id => `/api/content/${id}`,
    CREATE: '/api/auth/content',
    DOWNLOAD: id => `/api/auth/content/${id}/download`,
    VOTE: id => `/api/auth/content/${id}/vote`,
    BOOKMARK: id => `/api/auth/content/${id}/bookmark`,
    COMMENTS: {
      GET: id => `/api/content/${id}/comments`,
      CREATE: id => `/api/auth/content/${id}/comments`,
    }
  },
  FEED: '/api/auth/feed',
  SEARCH: '/api/auth/search',
};

/**
 * API request helpers
 */
async function apiPost(endpoint, data = {}) {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint, data });
    throw error;
  }
}

async function apiGet(endpoint) {
  try {
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint });
    throw error;
  }
}

async function apiDelete(endpoint) {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint });
    throw error;
  }
}

async function apiPatch(endpoint, data = {}) {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint, data });
    throw error;
  }
}

// Export to global scope
window.r3l = {
  isAuthenticated,
  authenticatedFetch,
  logout,
  apiPost,
  apiGet,
  apiDelete,
  apiPatch,
  API_ENDPOINTS
};