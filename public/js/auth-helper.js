/**
 * Authentication helper - delegates to secure-api-helper
 */

// Re-export authentication functions from secure-api-helper
window.authHelper = {
  isAuthenticated: () => window.r3l?.isAuthenticated() || false,
  logout: () => window.r3l?.logout(),
  authenticatedFetch: (url, options) => window.r3l?.authenticatedFetch(url, options)
};