/**
 * R3L:F Navigation Bar Component
 * Provides a consistent navigation bar across all pages
 */

// Note: Imports from cookie-helper and the old api-helper are removed.
// The new api-helper.js attaches its functions to the window.r3l object.

// Define a simple debug log function
const debugLog = (component, message, data) => {
  console.log(`[${component}] ${message}`, data || '');
};

export class NavigationBar {
  /**
   * Initialize the navigation bar
   * @param {string} currentPage - The current page ID (e.g., 'home', 'search', etc.)
   */
  static init(currentPage) {
    debugLog('NavigationBar', 'Initializing navigation bar', { currentPage });

    const navHtml = `
      <div class="navbar">
        <div class="nav-brand">
          <a href="/index.html" title="R3L:F Home" class="flex items-center gap-2">
            <span class="material-icons" aria-hidden="true">public</span>
            <span class="text-accent">R3L:F</span>
          </a>
        </div>
        <nav>
          <ul class="nav-menu">
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons" aria-hidden="true">explore</span>
                <span class="nav-label">Explore</span>
              </a>
              <div class="nav-dropdown">
                <a href="/network.html" class="dropdown-item ${currentPage === 'network' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">hub</span>
                  Association Web
                </a>
                <a href="/map.html" class="dropdown-item ${currentPage === 'map' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">public</span>
                  Map
                </a>
                <a href="/random.html" class="dropdown-item ${currentPage === 'random' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">shuffle</span>
                  Random Communique
                </a>
              </div>
            </li>
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons" aria-hidden="true">people</span>
                <span class="nav-label">Connect</span>
              </a>
              <div class="nav-dropdown">
                <a href="/feed.html" class="dropdown-item ${currentPage === 'feed' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">dynamic_feed</span>
                  Feed
                </a>
                <a href="/connect.html" class="dropdown-item ${currentPage === 'connect' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">person_add</span>
                  Find People
                </a>
                <a href="/messages.html" class="dropdown-item ${currentPage === 'messages' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">chat</span>
                  Messages
                </a>
                <a href="/collaborate.html" class="dropdown-item ${currentPage === 'collaborate' ? 'active' : ''}">
                  <span class="material-icons">groups</span>
                  Collaborate
                </a>
              </div>
            </li>
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons" aria-hidden="true">folder</span>
                <span class="nav-label">Content</span>
              </a>
              <div class="nav-dropdown">
                <a href="/drawer.html" class="dropdown-item ${currentPage === 'drawer' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">folder</span>
                  My Drawer
                </a>
                <a href="/archive.html" class="dropdown-item ${currentPage === 'archive' ? 'active' : ''}">
                  <span class="material-icons">archive</span>
                  Community Archive
                </a>
                <a href="/upload.html" class="dropdown-item ${currentPage === 'upload' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">upload_file</span>
                  Upload Files
                </a>
              </div>
            </li>
            <li><a href="/search.html" class="nav-link ${currentPage === 'search' ? 'active' : ''}">
              <span class="material-icons" aria-hidden="true">search</span>
              <span class="nav-label">Search</span>
            </a></li>
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons" aria-hidden="true">help_outline</span>
                <span class="nav-label">Info</span>
              </a>
              <div class="nav-dropdown">
                <a href="/help.html" class="dropdown-item ${currentPage === 'help' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">help_outline</span>
                  Help & FAQ
                </a>
                <a href="/about.html" class="dropdown-item ${currentPage === 'about' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">info</span>
                  About
                </a>
                <a href="/sitemap.html" class="dropdown-item ${currentPage === 'sitemap' ? 'active' : ''}">
                  <span class="material-icons" aria-hidden="true">map</span>
                  Site Map
                </a>
              </div>
            </li>
            <li id="nav-login-item"><a href="/auth/login.html" class="nav-link ${currentPage === 'login' || currentPage === 'register' || currentPage === 'recovery' ? 'active' : ''}">
              <span class="material-icons" aria-hidden="true">login</span>
              <span class="nav-label">Login</span>
            </a></li>
          </ul>
        </nav>
      </div>
    `;

    const header = document.querySelector('header');
    if (header) {
      header.innerHTML = `<div class="container">${navHtml}</div>`;
      this.updateAuthState();
    } else {
      debugLog('NavigationBar', 'Error: Header element not found');
    }
  }

  /**
   * Update navigation based on authentication state.
   */
  static updateAuthState() {
    const loginItem = document.getElementById('nav-login-item');
    if (!loginItem) return;

    if (window.r3l && window.r3l.isAuthenticated()) {
      debugLog('NavigationBar', 'User is authenticated, fetching profile...');
      this.fetchUserProfile()
        .then(user => {
          if (user) {
            loginItem.innerHTML = `
              <div class="user-profile-nav">
                <a href="/profile.html" class="nav-link user-profile-link">
                  <span class="user-avatar">
                    <div class="avatar-initial">${(user.displayName || user.username || '?').charAt(0).toUpperCase()}</div>
                  </span>
                  <span class="user-name">${user.displayName || user.username}</span>
                </a>
                <div class="user-dropdown">
                  <a href="/profile.html" class="dropdown-item">
                    <span class="material-icons" aria-hidden="true">person</span>
                    My Profile
                  </a>
                  <a href="/drawer.html" class="dropdown-item">
                    <span class="material-icons" aria-hidden="true">folder</span>
                    My Drawer
                  </a>
                  <a href="#" id="logout-link" class="dropdown-item">
                    <span class="material-icons" aria-hidden="true">logout</span>
                    Logout
                  </a>
                </div>
              </div>
            `;
            document.getElementById('logout-link')?.addEventListener('click', e => {
              e.preventDefault();
              this.logout();
            });
          } else {
            this.handleAuthError();
          }
        })
        .catch(err => {
          console.error('[NavigationBar] Failed to fetch user profile:', err);
          this.handleAuthError();
        });
    } else {
      debugLog('NavigationBar', 'User is not authenticated, showing login link.');
      this.handleAuthError();
    }
  }

  /**
   * Fetch user profile data from the new /api/profile endpoint
   * @returns {Promise<Object|null>} User profile data or null if an error occurs
   */
  static async fetchUserProfile() {
    if (!window.r3l || !window.r3l.apiGet) {
        console.error("R3L API helper not loaded.");
        return null;
    }
    try {
      const user = await window.r3l.apiGet('/api/profile');
      debugLog('NavigationBar', 'Profile response:', user);
      return user;
    } catch (error) {
      console.error('[NavigationBar] Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Handle authentication errors by resetting the login link.
   */
  static handleAuthError() {
    const loginItem = document.getElementById('nav-login-item');
    if (loginItem) {
      loginItem.innerHTML = `<a href="/auth/login.html" class="nav-link">
        <span class="material-icons">login</span>
        <span class="nav-label">Login</span>
      </a>`;
    }
  }

  /**
   * Log the user out by clearing the token and redirecting.
   */
  static logout() {
    debugLog('NavigationBar', 'Logging out...');
    if (window.r3l) {
        window.r3l.storeAuthToken(null);
    }
    window.location.href = '/login.html?message=' + encodeURIComponent('You have been logged out.');
  }
}