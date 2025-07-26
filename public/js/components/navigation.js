/**
 * R3L:F Navigation Bar Component
 * Provides a consistent navigation bar across all pages
 */

import { notificationManager } from './notification.js';

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
    
    // Create the navigation HTML - More compact design with logo on left, nav items on right
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
            <li><a href="/network.html" class="nav-link ${currentPage === 'network' ? 'active' : ''}">
              <span class="material-icons">hub</span>
              <span class="nav-label">Association Web</span>
            </a></li>
            <li><a href="/map.html" class="nav-link ${currentPage === 'map' ? 'active' : ''}">
              <span class="material-icons">public</span>
              <span class="nav-label">Map</span>
            </a></li>
            <li><a href="/search.html" class="nav-link ${currentPage === 'search' ? 'active' : ''}">
              <span class="material-icons">search</span>
              <span class="nav-label">Search</span>
            </a></li>
            <li><a href="/random.html" class="nav-link tooltip ${currentPage === 'random' ? 'active' : ''}">
              <span class="material-icons">shuffle</span>
              <span class="tooltip-text">Random Communique</span>
              <span class="nav-label">Random</span>
            </a></li>
            <li><a href="/drawer.html" class="nav-link ${currentPage === 'drawer' ? 'active' : ''}">
              <span class="material-icons">folder</span>
              <span class="nav-label">Drawer</span>
            </a></li>
            <li><a href="/upload.html" class="nav-link ${currentPage === 'upload' ? 'active' : ''}">
              <span class="material-icons">upload_file</span>
              <span class="nav-label">Upload</span>
            </a></li>
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
    // Function to get cookie value by name
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    // Check for JWT cookie (but note that it's HttpOnly and won't be accessible to JavaScript)
    // We'll instead fetch the validation endpoint
    const loginItem = document.getElementById('nav-login-item');
    
    console.log('[NavigationBar] Auth state check:', {
      allCookies: document.cookie,
      loginItemFound: !!loginItem
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
                  <span class="user-avatar glow-accent">
                    ${user.avatar_url ? 
                      `<img src="${user.avatar_url}" alt="${user.display_name}" class="avatar-img" />` : 
                      `<span class="material-icons">account_circle</span>`
                    }
                  </span>
                  <span class="user-name">${user.displayName || user.username}</span>
                </a>
                <div class="user-dropdown">
                  <a href="/profile.html" class="dropdown-item">
                    <span class="material-icons">person</span>
                    My Profile
                  </a>
                  <a href="/drawer.html?user=${user.username}" class="dropdown-item">
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
            notificationManager.createNotificationElements();
            notificationManager.startPolling(30000); // Poll every 30 seconds
            
            // Fetch notifications immediately
            notificationManager.fetchUnreadCount()
              .then(count => {
                console.log('[NavigationBar] Initial unread notifications count:', count);
              })
              .catch(err => {
                console.error('[NavigationBar] Error fetching initial notifications:', err);
              });
          } else {
            console.log('[NavigationBar] User profile was null, showing login link');
          }
        })
        .catch(err => {
          console.error('[NavigationBar] Failed to fetch user profile:', err);
          // User is not authenticated, show login link (no need to do anything)
          console.log('[NavigationBar] No auth, showing login link');
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
        cookieLength: document.cookie.length
      });
      
      // Use credentials: 'include' to ensure cookies are sent with the request
      console.log('[NavigationBar] Fetching profile from /api/auth/jwt/profile with credentials:include');
      const startTime = performance.now();
      const response = await fetch('/api/auth/jwt/profile', {
        credentials: 'include'
      });
      const endTime = performance.now();
      
      console.log('[NavigationBar] Profile response:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${(endTime - startTime).toFixed(2)}ms`,
        headers: [...response.headers.entries()].reduce((obj, [key, val]) => ({...obj, [key]: val}), {})
      });
      
      if (!response.ok) {
        throw new Error(`Invalid session: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[NavigationBar] Profile data:', data);
      return data;
    } catch (error) {
      console.error('[NavigationBar] Error fetching user profile:', error);
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
    
    // Call logout API
    fetch('/api/auth/jwt/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
    .then(response => {
      console.log('Logout response:', response.status, response.statusText);
      // Reload the page to force a refresh of all components
      window.location.href = '/auth/login.html?message=' + encodeURIComponent('You have been logged out successfully.');
    })
    .catch(error => {
      console.error('Logout error:', error);
      // Reload the page to force a refresh of all components
      window.location.href = '/auth/login.html?message=' + encodeURIComponent('Error during logout.');
    });
  }
}
