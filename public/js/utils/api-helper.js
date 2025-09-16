/**
 * API Helper Utility
 * Provides consistent interface for API calls with proper error handling
 */

import { isAuthenticated, authenticatedFetch } from './cookie-helper.js';

// Define API endpoints centrally to avoid mismatches
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    PROFILE: '/api/auth/jwt/profile',
    LOGIN: '/api/auth/jwt/login',
    LOGOUT: '/api/auth/jwt/logout',
    FIX_COOKIES: '/api/auth/fix-cookies',
  },

  // Content endpoints
  CONTENT: {
    SEARCH: '/api/search',
    GET: id => `/api/content/${id}`,
    CREATE: '/api/content',
    UPDATE: id => `/api/content/${id}`,
    DELETE: id => `/api/content/${id}`,
    VOTE: id => `/api/content/${id}/vote`,
    TAGS: id => `/api/content/${id}/tags`,
    FEED: '/api/feed',
    COMMENTS: {
      GET: id => `/api/content/${id}/comments`,
      CREATE: id => `/api/content/${id}/comments`,
      UPDATE: (id, commentId) => `/api/content/${id}/comments/${commentId}`,
      DELETE: (id, commentId) => `/api/content/${id}/comments/${commentId}`,
    },
    BOOKMARK: {
      ADD: id => `/api/content/${id}/bookmark`,
      REMOVE: id => `/api/content/${id}/bookmark`,
    },
    REACTIONS: {
      GET: id => `/api/content/${id}/reactions`,
      ADD: id => `/api/content/${id}/reactions`,
      REMOVE: id => `/api/content/${id}/reactions`,
    },
  },

  // User endpoints
  USERS: {
    LIST: '/api/users',
    GET: id => `/api/users/${id}`,
    PROFILE: id => `/api/users/${id}`,
    PREFERENCES: id => `/api/users/${id}/preferences`,
    FILES: id => `/api/users/${id}/files`,
    BOOKMARKS: id => `/api/users/${id}/bookmarks`,

  },

  // Connection endpoints
  CONNECTIONS: {
    LIST: '/api/connections',
    NETWORK: '/api/connections/network',
    CREATE: '/api/connections',
    UPDATE: id => `/api/connections/${id}`,
    DELETE: id => `/api/connections/${id}`,
    STATUS: userId => `/api/connections/status/${userId}`,
    REQUESTS: '/api/connections/requests',
    ACCEPT: userId => `/api/connections/request/${userId}/accept`,
    DECLINE: userId => `/api/connections/request/${userId}/decline`,
    CANCEL: userId => `/api/connections/request/${userId}/cancel`,
  },

  // Globe/map endpoints
  GLOBE: {
    DATA_POINTS: '/api/globe/data-points',
    POINTS: '/api/globe/points',
    POINT: id => `/api/globe/points/${id}`,
  },

  // Notification endpoints
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: '/api/notifications/mark-read',
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    DELETE: id => `/api/notifications/${id}`,
  },

  // Debug endpoints
  DEBUG: {
    COOKIE_CHECK: '/api/debug/cookie-check',
    ENV_CHECK: '/api/debug/env-check',
  },
};

/**
 * Make an API GET request
 * @param {string} endpoint The API endpoint
 * @param {object} params URL query parameters
 * @returns {Promise<any>} The JSON response
 */
export async function apiGet(endpoint, params = {}) {
  // Build URL with query parameters
  const url = new URL(endpoint, window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  try {
    const response = await authenticatedFetch(url.toString());

    // Check for authentication error
    if (response.status === 401) {
      console.warn('Authentication required for API call:', endpoint);
      return { error: 'Authentication required', status: 401 };
    }

    // Check for other errors
    if (!response.ok) {
      console.error('API error:', response.status, await response.text());
      return { error: `API error: ${response.status}`, status: response.status };
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint, params });
    return { error: error.message || 'Network error', status: 0 };
  }
}

/**
 * Make a file upload request
 * @param {string} endpoint The API endpoint
 * @param {FormData} formData The form data to send
 * @returns {Promise<any>} The JSON response
 */
export async function apiUpload(endpoint, formData) {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
      body: formData,
      // Note: Do not set Content-Type header for FormData, browser does it with boundary
    });

    // Check for authentication error
    if (response.status === 401) {
      console.warn('Authentication required for API call:', endpoint);
      return { error: 'Authentication required', status: 401 };
    }

    // Check for other errors
    if (!response.ok) {
      console.error('API error:', response.status, await response.text());
      return { error: `API error: ${response.status}`, status: response.status };
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint });
    return { error: error.message || 'Network error', status: 0 };
  }
}

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

    // Check for authentication error
    if (response.status === 401) {
      console.warn('Authentication required for API call:', endpoint);
      return { error: 'Authentication required', status: 401 };
    }

    // Check for other errors
    if (!response.ok) {
      console.error('API error:', response.status, await response.text());
      return { error: `API error: ${response.status}`, status: response.status };
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint, data });
    return { error: error.message || 'Network error', status: 0 };
  }
}

/**
 * Make an API PATCH request
 * @param {string} endpoint The API endpoint
 * @param {object} data The data to send
 * @returns {Promise<any>} The JSON response
 */
export async function apiPatch(endpoint, data = {}) {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    // Check for authentication error
    if (response.status === 401) {
      console.warn('Authentication required for API call:', endpoint);
      return { error: 'Authentication required', status: 401 };
    }

    // Check for other errors
    if (!response.ok) {
      console.error('API error:', response.status, await response.text());
      return { error: `API error: ${response.status}`, status: response.status };
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint, data });
    return { error: error.message || 'Network error', status: 0 };
  }
}

/**
 * Make an API PUT request
 * @param {string} endpoint The API endpoint
 * @param {object} data The data to send
 * @returns {Promise<any>} The JSON response
 */
export async function apiPut(endpoint, data = {}) {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    // Check for authentication error
    if (response.status === 401) {
      console.warn('Authentication required for API call:', endpoint);
      return { error: 'Authentication required', status: 401 };
    }

    // Check for other errors
    if (!response.ok) {
      console.error('API error:', response.status, await response.text());
      return { error: `API error: ${response.status}`, status: response.status };
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint, data });
    return { error: error.message || 'Network error', status: 0 };
  }
}

/**
 * Make an API DELETE request
 * @param {string} endpoint The API endpoint
 * @returns {Promise<any>} The JSON response
 */
export async function apiDelete(endpoint) {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'DELETE',
    });

    // Check for authentication error
    if (response.status === 401) {
      console.warn('Authentication required for API call:', endpoint);
      return { error: 'Authentication required', status: 401 };
    }

    // Check for other errors
    if (!response.ok) {
      console.error('API error:', response.status, await response.text());
      return { error: `API error: ${response.status}`, status: response.status };
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error, { endpoint });
    return { error: error.message || 'Network error', status: 0 };
  }
}
