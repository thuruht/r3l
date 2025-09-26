/**
 * API Helper Utility
 * Provides a consistent interface for API calls using bearer token authentication.
 */

/**
 * Stores the authentication token in localStorage.
 * @param {string} token - The authentication token to store.
 */
function storeAuthToken(token) {
  if (token) {
    localStorage.setItem('r3l_auth_token', token);
  } else {
    localStorage.removeItem('r3l_auth_token');
  }
}

/**
 * Retrieves the authentication token from localStorage.
 * @returns {string|null} The authentication token, or null if not found.
 */
function getAuthToken() {
  return localStorage.getItem('r3l_auth_token');
}

/**
 * Checks if the user is currently authenticated.
 * @returns {boolean} True if an auth token exists, false otherwise.
 */
function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * A wrapper around the native fetch API that automatically adds the
 * Authorization header for authenticated requests.
 *
 * @param {string} url - The URL to fetch.
 * @param {object} options - The options to pass to the fetch API.
 * @returns {Promise<Response>} A promise that resolves to the fetch response.
 */
async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const finalOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, finalOptions);
    if (response.status === 401) {
      // Unauthorized, token might be expired or invalid.
      // Clear the token and redirect to the login page.
      storeAuthToken(null);
      window.location.href = '/login.html';
    }
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Define API endpoints centrally to avoid mismatches
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/api/register',
    LOGIN: '/api/login',
    PROFILE: '/api/profile',
  },

  // Bookmarks
  BOOKMARKS: '/api/bookmarks',

  // Content endpoints
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

  // Network endpoints
  NETWORK: '/api/network',

  // Collaboration endpoints
  COLLABORATION: id => `/api/collaboration/${id}`,

  // Visualization endpoints
  VISUALIZATION: {
      STATS: '/api/visualization/stats',
  },

  // Messaging endpoints
  MESSAGES: {
    CONVERSATIONS: '/api/messages/conversations',
    GET: otherUserId => `/api/messages/user/${otherUserId}`,
    SEND: '/api/messages/send',
  },

  // Notification endpoints
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: '/api/notifications/mark-read',
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    DELETE: id => `/api/notifications/${id}`,
  },

  // User specific endpoints
  USER: {
      STATS: '/api/user/stats',
      FILES: '/api/user/files',
      PREFERENCES: '/api/user/preferences',
      PROFILE: '/api/user/profile',
  },

  // Feed endpoint
  FEED: '/api/feed',

  // File uploads
  FILES: {
      AVATAR: '/api/files/avatar',
  }
};

/**
 * Make an API POST request
 * @param {string} endpoint The API endpoint
 * @param {object} data The data to send
 * @returns {Promise<any>} The JSON response
 */
export async function apiPost(endpoint, data = {}) {
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

/**
 * Make an API GET request
 * @param {string} endpoint The API endpoint
 * @returns {Promise<any>} The JSON response
 */
export async function apiGet(endpoint) {
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

// Export functions to be used in other scripts
window.r3l = {
  storeAuthToken,
  getAuthToken,
  isAuthenticated,
  authenticatedFetch,
  apiPost,
  apiGet,
  API_ENDPOINTS
};