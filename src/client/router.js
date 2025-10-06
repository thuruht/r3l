// A simple client-side router with component lifecycle handling.

const routes = {};
const appRoot = document.getElementById('app-root');
let currentPageCleanup = null; // To hold the cleanup function of the current page

/**
 * Renders the content for the current URL path.
 */
async function routeHandler() {
  // If a cleanup function exists for the previous page, run it.
  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  let path = window.location.pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  // Default to home page if path is empty
  if (path === '') {
      path = '/';
  }

  const handler = routes[path] || routes[path + '.html'] || routes['/404'];

  if (handler) {
    try {
      appRoot.innerHTML = '<p>Loading...</p>';
      const pageElement = await handler();

      // Store the cleanup function if the page component provides one
      if (typeof pageElement.cleanup === 'function') {
        currentPageCleanup = pageElement.cleanup;
      }

      appRoot.innerHTML = '';
      appRoot.appendChild(pageElement);
    } catch (error) {
      console.error('Error rendering page:', error);
      appRoot.innerHTML = '<p>Sorry, something went wrong.</p>';
    }
  } else {
    appRoot.innerHTML = '<h2>404 - Page Not Found</h2>';
  }
}

/**
 * Intercepts clicks on links to handle them with the router.
 */
function linkInterceptor(event) {
    const link = event.target.closest('a');
    if (link && link.target !== '_blank' && link.origin === window.location.origin) {
        event.preventDefault();
        window.history.pushState({}, '', link.href);
        routeHandler();
    }
}

export const router = {
  /**
   * Adds a new route and its handler.
   */
  addRoute: (path, handler) => {
    if (path.endsWith('.html')) {
        path = path.slice(0, -5);
    }
     if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    routes[path] = handler;
  },

  /**
   * Initializes the router.
   */
  start: () => {
    document.addEventListener('click', linkInterceptor);
    window.addEventListener('popstate', routeHandler);
    document.addEventListener('DOMContentLoaded', routeHandler);
    routeHandler();
  },
};