/**
 * R3L:F Navigation Bar Component
 * Provides a consistent navigation bar across all pages
 */

export class NavigationBar {
  /**
   * Initialize the navigation bar
   * @param {string} currentPage - The current page ID (e.g., 'home', 'search', etc.)
   */
  static init(currentPage) {
    // Create the navigation HTML - More compact design with logo on left, nav items on right
    const navHtml = `
      <div class="navbar">
        <div class="nav-brand">
          <a href="index.html" title="R3L:F Home" class="flex items-center gap-2">
            <span class="material-icons" aria-hidden="true">public</span>
            <span class="text-accent">R3L:F</span>
          </a>
        </div>
        <nav>
          <ul class="nav-menu">
            <li><a href="network.html" class="nav-link ${currentPage === 'network' ? 'active' : ''}">
              <span class="material-icons">hub</span>
              <span class="nav-label">Association Web</span>
            </a></li>
            <li><a href="map.html" class="nav-link ${currentPage === 'map' ? 'active' : ''}">
              <span class="material-icons">public</span>
              <span class="nav-label">Map</span>
            </a></li>
            <li><a href="search.html" class="nav-link ${currentPage === 'search' ? 'active' : ''}">
              <span class="material-icons">search</span>
              <span class="nav-label">Search</span>
            </a></li>
            <li><a href="random.html" class="nav-link tooltip ${currentPage === 'random' ? 'active' : ''}">
              <span class="material-icons">shuffle</span>
              <span class="tooltip-text">Random Communique</span>
              <span class="nav-label">Random</span>
            </a></li>
            <li><a href="drawer.html" class="nav-link ${currentPage === 'drawer' ? 'active' : ''}">
              <span class="material-icons">folder</span>
              <span class="nav-label">Drawer</span>
            </a></li>
            <li><a href="upload.html" class="nav-link ${currentPage === 'upload' ? 'active' : ''}">
              <span class="material-icons">upload_file</span>
              <span class="nav-label">Upload</span>
            </a></li>
            <li id="nav-login-item"><a href="login.html" class="nav-link ${currentPage === 'login' ? 'active' : ''}">
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
    } else {
      console.error('Header element not found');
    }
  }
  
  /**
   * Update navigation based on authentication state
   */
  static updateAuthState() {
    // Check for authentication token
    const hasAuthCookie = document.cookie.includes('r3l_session=');
    const loginItem = document.getElementById('nav-login-item');
    
    // If logged in, update the login link to show user profile
    if (hasAuthCookie && loginItem) {
      // Fetch user data from API
      this.fetchUserProfile()
        .then(user => {
          if (user) {
            loginItem.innerHTML = `
              <div class="user-profile-nav">
                <a href="profile.html" class="nav-link user-profile-link">
                  <span class="user-avatar glow-accent">
                    ${user.avatar_url ? 
                      `<img src="${user.avatar_url}" alt="${user.display_name}" class="avatar-img" />` : 
                      `<span class="material-icons">account_circle</span>`
                    }
                  </span>
                  <span class="user-name">${user.display_name}</span>
                </a>
                <div class="user-dropdown">
                  <a href="profile.html" class="dropdown-item">
                    <span class="material-icons">person</span>
                    My Profile
                  </a>
                  <a href="drawer.html?user=${user.username}" class="dropdown-item">
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
          }
        })
        .catch(err => {
          console.error('Failed to fetch user profile:', err);
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
      // Get auth token from cookie
      const match = document.cookie.match(/r3l_session=([^;]+)/);
      if (!match) return null;
      
      const token = match[1];
      
      // Fetch user profile
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid session');
      }
      
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
  
  /**
   * Handle authentication errors
   */
  static handleAuthError() {
    // Clear auth cookie
    document.cookie = 'r3l_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Reset login item
    const loginItem = document.getElementById('nav-login-item');
    if (loginItem) {
      loginItem.innerHTML = `<a href="login.html" class="nav-link">
        <span class="material-icons">login</span>
        <span class="nav-label">Login</span>
      </a>`;
    }
  }
  
  /**
   * Log the user out
   */
  static logout() {
    // Call logout API
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .finally(() => {
      // Clear auth cookie
      document.cookie = 'r3l_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Redirect to home page
      window.location.href = '/';
    });
  }
}
