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
    // Create the navigation HTML
    const navHtml = `
      <nav>
        <a href="index.html" class="logo">R3L:F</a>
        <div class="nav-links">
          <a href="index.html" ${currentPage === 'home' ? 'class="active"' : ''}>Home</a>
          <a href="search.html" ${currentPage === 'search' ? 'class="active"' : ''}>Search</a>
          <a href="drawer.html" ${currentPage === 'drawer' ? 'class="active"' : ''}>My Drawer</a>
          <a href="network.html" ${currentPage === 'network' ? 'class="active"' : ''}>Network</a>
          <a href="map.html" ${currentPage === 'map' ? 'class="active"' : ''}>Map</a>
          <a href="random.html" ${currentPage === 'random' ? 'class="active"' : ''}>Random</a>
          <a href="upload.html" ${currentPage === 'upload' ? 'class="active"' : ''}>Upload</a>
          <a href="login.html" ${currentPage === 'login' ? 'class="active"' : ''}>Login</a>
        </div>
        <button class="nav-toggle" aria-label="Toggle navigation">
          <span class="material-icons">menu</span>
        </button>
      </nav>
    `;
    
    // Find the header container
    const headerContainer = document.querySelector('header .container');
    
    if (headerContainer) {
      // Replace the existing navigation
      headerContainer.innerHTML = navHtml;
      
      // Add mobile navigation toggle functionality
      const navToggle = headerContainer.querySelector('.nav-toggle');
      const navLinks = headerContainer.querySelector('.nav-links');
      
      if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
          navLinks.classList.toggle('show');
        });
      }
    } else {
      console.error('Header container not found');
    }
  }
}
