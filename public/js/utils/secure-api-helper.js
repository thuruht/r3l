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

// API endpoints (same as before)
const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/register',
    LOGIN: '/api/login',
    PROFILE: '/api/profile',
  },
  BOOKMARKS: '/api/bookmarks',
  CONTENT: {
    GET: id => `/api/content/${id}`,
    CREATE: '/api/content',
    DOWNLOAD: id => `/api/content/${id}/download`,
    VOTE: id => `/api/content/${id}/vote`,
    BOOKMARK: id => `/api/content/${id}/bookmark`,
    REACT: id => `/api/content/${id}/react`,
    COMMENTS: {
      GET: id => `/api/content/${id}/comments`,
      CREATE: id => `/api/content/${id}/comments`,
    }
  },
  NETWORK: '/api/network',
  COLLABORATION: id => `/api/collaboration/${id}`,
  VISUALIZATION: {
    STATS: '/api/visualization/stats',
  },
  MESSAGES: {
    CONVERSATIONS: '/api/messages/conversations',
    GET: otherUserId => `/api/messages/user/${otherUserId}`,
    SEND: '/api/messages/send',
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: '/api/notifications/mark-read',
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    DELETE: id => `/api/notifications/${id}`,
  },
  USER: {
    STATS: '/api/user/stats',
    FILES: '/api/user/files',
    PREFERENCES: '/api/user/preferences',
    PROFILE: '/api/user/profile',
  },
  FEED: '/api/feed',
  FILES: {
    AVATAR: '/api/files/avatar',
  },
  WORKSPACES: {
    LIST: '/api/workspaces',
    CREATE: '/api/workspaces',
  },
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