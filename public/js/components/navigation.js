/**
 * R3L:F Navigation Bar Component
 * Provides a consistent navigation bar across all pages
 */

import { notificationManager } from './notification.js';
import { getCookie, isAuthenticated, fixAuthCookies } from '../utils/cookie-helper.js';
import { apiGet, apiPost, API_ENDPOINTS } from '../utils/api-helper.js';

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

    // Create the navigation HTML - Organized with dropdown menus for better organization
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
            <!-- Main navigation items with focused primary items -->
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons">explore</span>
                <span class="nav-label">Explore</span>
              </a>
              <div class="nav-dropdown">
                <a href="/network.html" class="dropdown-item ${currentPage === 'network' ? 'active' : ''}">
                  <span class="material-icons">hub</span>
                  Association Web
                </a>
                <a href="/map.html" class="dropdown-item ${currentPage === 'map' ? 'active' : ''}">
                  <span class="material-icons">public</span>
                  Map
                </a>
                <a href="/random.html" class="dropdown-item ${currentPage === 'random' ? 'active' : ''}">
                  <span class="material-icons">shuffle</span>
                  Random Communique
                </a>
              </div>
            </li>
            
            <!-- Connect and Collaborate group -->
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons">people</span>
                <span class="nav-label">Connect</span>
              </a>
              <div class="nav-dropdown">
                <a href="/feed.html" class="dropdown-item ${currentPage === 'feed' ? 'active' : ''}">
                  <span class="material-icons">dynamic_feed</span>
                  Feed
                </a>
                <a href="/connect.html" class="dropdown-item ${currentPage === 'connect' ? 'active' : ''}">
                  <span class="material-icons">person_add</span>
                  Find People
                </a>
                <a href="/messages.html" class="dropdown-item ${currentPage === 'messages' ? 'active' : ''}">
                  <span class="material-icons">chat</span>
                  Messages
                </a>
                <a href="/collaborate.html" class="dropdown-item ${currentPage === 'collaborate' ? 'active' : ''}">
                  <span class="material-icons">groups</span>
                  Collaborate
                </a>
              </div>
            </li>
            
            <!-- Content group -->
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons">folder</span>
                <span class="nav-label">Content</span>
              </a>
              <div class="nav-dropdown">
                <a href="/drawer.html" class="dropdown-item ${currentPage === 'drawer' ? 'active' : ''}">
                  <span class="material-icons">folder</span>
                  My Drawer
                </a>
                <a href="/upload.html" class="dropdown-item ${currentPage === 'upload' ? 'active' : ''}">
                  <span class="material-icons">upload_file</span>
                  Upload Files
                </a>
              </div>
            </li>
            
            <!-- Keep Search as a main item -->
            <li><a href="/search.html" class="nav-link ${currentPage === 'search' ? 'active' : ''}">
              <span class="material-icons">search</span>
              <span class="nav-label">Search</span>
            </a></li>
            
            <!-- Help and About dropdown -->
            <li class="dropdown-container">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-icons">help_outline</span>
                <span class="nav-label">Info</span>
              </a>
              <div class="nav-dropdown">
                <a href="/help.html" class="dropdown-item ${currentPage === 'help' ? 'active' : ''}">
                  <span class="material-icons">help_outline</span>
                  Help & FAQ
                </a>
                <a href="/about.html" class="dropdown-item ${currentPage === 'about' ? 'active' : ''}">
                  <span class="material-icons">info</span>
                  About
                </a>
                <a href="/sitemap.html" class="dropdown-item ${currentPage === 'sitemap' ? 'active' : ''}">
                  <span class="material-icons">map</span>
                  Site Map
                </a>
              </div>
            </li>
            
            <!-- Login remains a direct link -->
            <li id="nav-login-item"><a href="/auth/login.html" class="nav-link ${currentPage === 'login' ? 'active' : ''}">
              <span class="material-icons">login</span>
              <span class="nav-label">Login</span>
            </a></li>
          </ul>
        </nav>
      </div>
    `;

    // Find the header element
    const header = document.querySelector('header');

    if (header) {
      // Set content of header
      header.innerHTML = `<div class="container">${navHtml}</div>`;

      // Check if user is logged in and update navigation accordingly
      this.updateAuthState();

      // Load notification CSS
      this.loadNotificationStyles();
    } else {
      debugLog('NavigationBar', 'Error: Header element not found');
    }
  }

  /**
   * Show a demo-mode banner with optional diagnostic controls
   */
  static showDemoBanner(
    message = 'The application is currently running in demo mode. Some features require a configured backend or an authenticated session.'
  ) {
    // Avoid duplicating banner
    if (document.getElementById('demo-mode-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'demo-mode-banner';
    banner.className = 'demo-mode-banner container';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;background:#fff3cd;border:1px solid #ffeeba;border-radius:6px;margin-top:8px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <strong style="color:#856404">Demo mode</strong>
          <span style="color:#856404">${message}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="demo-fix-cookies" class="btn btn-small">Fix Cookies</button>
          <button id="demo-run-diagnostics" class="btn btn-small">Run diagnostics</button>
          <button id="demo-dismiss" class="btn btn-small">Dismiss</button>
        </div>
      </div>
    `;

    // Insert banner after header
    const headerEl = document.querySelector('header');
    if (headerEl && headerEl.parentNode) {
      headerEl.parentNode.insertBefore(banner, headerEl.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }

    // Wire up diagnostics and dismiss
    document.getElementById('demo-dismiss')?.addEventListener('click', () => {
      banner.remove();
    });

    // Wire up fix cookies button
    document.getElementById('demo-fix-cookies')?.addEventListener('click', async () => {
      const fixBtn = document.getElementById('demo-fix-cookies');
      if (fixBtn) fixBtn.textContent = 'Fixing...';
      try {
        await fixAuthCookies();
        // Try to fetch profile again
        await this.fetchUserProfile();
        // If successful, the banner will be cleared automatically
      } catch (err) {
        console.error('[Cookie Fix] Error:', err);
        const errEl = document.createElement('div');
        errEl.style.color = 'red';
        errEl.textContent = `Cookie fix failed: ${err?.message || err}`;
        banner.appendChild(errEl);
      } finally {
        if (fixBtn) fixBtn.textContent = 'Fix Cookies';
      }
    });

    document.getElementById('demo-run-diagnostics')?.addEventListener('click', async () => {
      const diagBtn = document.getElementById('demo-run-diagnostics');
      if (diagBtn) diagBtn.textContent = 'Running...';
      try {
        // Call cookie-check endpoint (does not require auth)
        const data = await apiGet(API_ENDPOINTS.DEBUG.COOKIE_CHECK);
        console.log('[Demo Diagnostics] cookie-check result:', data);

        // Show a compact result inline
        const details = document.createElement('pre');
        details.style.maxHeight = '240px';
        details.style.overflow = 'auto';
        details.style.marginTop = '8px';
        details.textContent = JSON.stringify(data, null, 2);

        // Remove any previous details
        const old = document.getElementById('demo-diagnostics-details');
        if (old) old.remove();

        details.id = 'demo-diagnostics-details';
        banner.appendChild(details);
      } catch (err) {
        console.error('[Demo Diagnostics] Error:', err);
        const errEl = document.createElement('div');
        errEl.style.color = 'red';
        errEl.textContent = `Diagnostics failed: ${err?.message || err}`;
        banner.appendChild(errEl);
      } finally {
        if (diagBtn) diagBtn.textContent = 'Run diagnostics';
      }
    });
  }

  static clearDemoBanner() {
    const el = document.getElementById('demo-mode-banner');
    if (el) el.remove();
  }

  /**
   * Load notification CSS
   */
  static loadNotificationStyles() {
    // Check if the notification CSS is already loaded
    if (!document.querySelector('link[href="/css/notifications.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/notifications.css';
      document.head.appendChild(link);
    }
  }

  /**
   * Update navigation based on authentication state
   */
  static updateAuthState() {
    const loginItem = document.getElementById('nav-login-item');

    console.log('[NavigationBar] Auth state check:', {
      authCookie: getCookie('r3l_auth_state'),
      isAuth: isAuthenticated(),
      allCookies: document.cookie,
      loginItemFound: !!loginItem,
    });

    // Directly fetch the profile to check authentication status
    if (loginItem) {
      console.log('[NavigationBar] Checking JWT authentication status...');

      // Fetch user data from API
      this.fetchUserProfile()
        .then(user => {
          console.log('[NavigationBar] User profile fetched:', user);
          if (user) {
            loginItem.innerHTML = `
              <div class="user-profile-nav">
                <a href="/profile.html" class="nav-link user-profile-link">
                  <span class="user-avatar">
                    ${
                      user.avatarUrl
                        ? `<img src="${user.avatarUrl}" alt="${user.displayName || user.username}" class="avatar-small" />`
                        : user.avatar_key
                          ? `<img src="/api/files/${user.avatar_key}" alt="${user.displayName || user.username}" class="avatar-small" />`
                          : `<div class="avatar-initial">${(user.displayName || user.username || '?').charAt(0).toUpperCase()}</div>`
                    }
                  </span>
                  <span class="user-name">${user.displayName || user.username}</span>
                </a>
                <div class="user-dropdown">
                  <a href="/profile.html" class="dropdown-item">
                    <span class="material-icons">person</span>
                    My Profile
                  </a>
                  <a href="/drawer.html" class="dropdown-item">
                    <span class="material-icons">folder</span>
                    My Drawer
                  </a>
                  <a href="#" id="logout-link" class="dropdown-item">
                    <span class="material-icons">logout</span>
                    Logout
                  </a>
                </div>
              </div>
            `;

            // Add event listener for logout
            document.getElementById('logout-link')?.addEventListener('click', e => {
              e.preventDefault();
              this.logout();
            });

            // Initialize notification system
            console.log('[NavigationBar] Initializing notification system');
            notificationManager.createNotificationElements({ userId: user.id });

            // Trigger connection suggestions
            apiPost(`/api/suggestions/connections/${user.id}`).catch(err => {
              console.error('Error triggering connection suggestions:', err);
            });
          } else {
            console.log('[NavigationBar] User profile was null, showing login link');
            this.handleAuthError();
          }
        })
        .catch(err => {
          console.error('[NavigationBar] Failed to fetch user profile:', err);
          // User is not authenticated, show login link
          console.log('[NavigationBar] No auth, showing login link');
          this.handleAuthError();
        });
    }
  }

  /**
   * Fetch user profile data
   * @returns {Promise<Object>} User profile data
   */
  static async fetchUserProfile() {
    try {
      // Debug cookie info
      console.log('[NavigationBar] Fetching profile - Current cookies:', {
        cookieString: document.cookie,
        cookieLength: document.cookie.length,
        authState: getCookie('r3l_auth_state'),
      });

      // Use API helper to fetch profile
      console.log('[NavigationBar] Fetching profile from', API_ENDPOINTS.AUTH.PROFILE);
      const startTime = performance.now();

      const data = await apiGet(API_ENDPOINTS.AUTH.PROFILE);

      const endTime = performance.now();

      console.log('[NavigationBar] Profile response:', {
        data,
        responseTime: `${(endTime - startTime).toFixed(2)}ms`,
      });

      if (data.error) {
        // Show demo banner to indicate non-functional backend or unauthenticated state
        this.showDemoBanner(
          data.status === 401
            ? 'You are not authenticated. Sign in to enable full functionality.'
            : 'Profile fetch failed - backend may be unavailable. Many features are disabled in demo mode.'
        );
        throw new Error(`Invalid session: ${data.error}`);
      }

      // Clear demo banner if present (we have a valid authenticated session)
      this.clearDemoBanner();
      return data;
    } catch (error) {
      console.error('[NavigationBar] Error fetching user profile:', error);
      // Show demo banner for any error path
      this.showDemoBanner();
      return null;
    }
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError() {
    // Reset login item
    const loginItem = document.getElementById('nav-login-item');
    if (loginItem) {
      loginItem.innerHTML = `<a href="/auth/login.html" class="nav-link">
        <span class="material-icons">login</span>
        <span class="nav-label">Login</span>
      </a>`;
    }
  }

  /**
   * Log the user out
   */
  static logout() {
    console.log('Logging out...');

    // Call logout API using our helper
    apiPost(API_ENDPOINTS.AUTH.LOGOUT)
      .then(response => {
        console.log('Logout response:', response);
        // Reload the page to force a refresh of all components
        window.location.href =
          '/auth/login.html?message=' +
          encodeURIComponent('You have been logged out successfully.');
      })
      .catch(error => {
        console.error('Logout error:', error);
        // Reload the page to force a refresh of all components
        window.location.href =
          '/auth/login.html?message=' + encodeURIComponent('Error during logout.');
      });
  }
}
