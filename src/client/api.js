/**
 * R3L:F API Client Module
 * A modern, promise-based API client for the R3L:F frontend.
 */

/**
 * A wrapper around the native fetch API that handles common tasks like
 * setting credentials, headers, and parsing JSON responses. It's designed
 * for internal use by the more specific API functions.
 *
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/feed').
 * @param {object} [options={}] - Standard fetch options (method, body, etc.).
 * @returns {Promise<any>} A promise that resolves with the JSON response data.
 * @throws {Error} Throws an error if the network request fails or the API returns an error.
 */
async function request(endpoint, options = {}) {
  const finalOptions = {
    // Include cookies in all requests to handle session-based authentication.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // If a body is provided and it's an object, stringify it.
  if (finalOptions.body && typeof finalOptions.body === 'object') {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  try {
    const response = await fetch(endpoint, finalOptions);

    // If the response is not ok (e.g., 404, 500), try to parse the error.
    if (!response.ok) {
      // If the user is unauthorized, redirect them to the login page.
      if (response.status === 401) {
        // Avoid redirect loops if we are already on the login page.
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login.html?message=' + encodeURIComponent('Your session has expired. Please log in again.');
        }
      }

      // Try to get a meaningful error message from the response body.
      const errorData = await response.json().catch(() => ({ error: `Request failed with status: ${response.status}` }));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    // For 204 No Content responses, return success without trying to parse JSON.
    if (response.status === 204) {
        return { success: true };
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for endpoint: ${endpoint}`, error);
    // Re-throw the error so the calling function can handle it.
    throw error;
  }
}

// --- Convenience Methods ---

export const get = (endpoint) => request(endpoint);
export const post = (endpoint, body) => request(endpoint, { method: 'POST', body });
export const put = (endpoint, body) => request(endpoint, { method: 'PUT', body });
export const del = (endpoint) => request(endpoint, { method: 'DELETE' });
export const patch = (endpoint, body) => request(endpoint, { method: 'PATCH', body });


// --- Authentication ---

/**
 * Checks if a user appears to be authenticated.
 * Note: This is a client-side check and not a guarantee of a valid session.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return document.cookie.includes('r3l_session=');
}

/**
 * Logs a user in.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<any>}
 */
export const login = (username, password) => post('/api/login', { username, password });

/**
 * Logs the current user out by calling the backend endpoint.
 * The calling code is responsible for redirecting the user.
 * @returns {Promise<any>}
 */
export const logout = () => post('/api/logout');

/**
 * Fetches the profile of the currently authenticated user.
 * @returns {Promise<any>}
 */
export const getUserProfile = () => get('/api/profile');


// --- Content & Feed ---

/**
 * Fetches the main content feed.
 * @param {object} [params] - Optional query parameters (e.g., { limit: 20, offset: 0 }).
 * @returns {Promise<any>}
 */
export const getFeed = (params) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return get(`/api/feed?${query}`);
};

/**
 * Fetches a single piece of content by its ID.
 * @param {string} id - The ID of the content.
 * @returns {Promise<any>}
 */
export const getContent = (id) => get(`/api/content/${id}`);

/**
 * Performs a search query.
 * @param {object} params - Query parameters (e.g., { q: 'search term', type: 'all' }).
 * @returns {Promise<any>}
 */
export const search = (params) => {
    const query = new URLSearchParams(params).toString();
    return get(`/api/search?${query}`);
};