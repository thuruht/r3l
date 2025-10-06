import { router } from './router.js';
import { Nav } from './components/Nav.js';
import { AboutPage } from './pages/about.js';
import { FeedPage } from './pages/feed.js';
import { HomePage } from './pages/home.js';
import { NetworkPage } from './pages/network.js';
import { MapPage } from './pages/map.js';
import { RandomPage } from './pages/random.js';
import { ConnectPage } from './pages/connect.js';
import { MessagesPage } from './pages/messages.js';
import { CollaboratePage } from './pages/collaborate.js';
import { DrawerPage } from './pages/drawer.js';
import { ArchivePage } from './pages/archive.js';
import { UploadPage } from './pages/upload.js';
import { SearchPage } from './pages/search.js';
import { HelpPage } from './pages/help.js';
import { SitemapPage } from './pages/sitemap.js';
import { LoginPage } from './pages/auth/login.js';


/**
 * Main application entry point.
 */
async function main() {
    console.log("SPA entry point loaded. Initializing application.");

    // Render the persistent navigation bar
    const mainHeader = document.getElementById('main-header');
    if (mainHeader) {
        const navElement = await Nav();
        mainHeader.appendChild(navElement);
    }

    // Register routes with the router
    router.addRoute('/', HomePage);
    router.addRoute('/index.html', HomePage);
    router.addRoute('/about', AboutPage);
    router.addRoute('/about.html', AboutPage);
    router.addRoute('/feed', FeedPage);
    router.addRoute('/feed.html', FeedPage);
    router.addRoute('/network', NetworkPage);
    router.addRoute('/network.html', NetworkPage);
    router.addRoute('/map', MapPage);
    router.addRoute('/map.html', MapPage);
    router.addRoute('/random', RandomPage);
    router.addRoute('/random.html', RandomPage);
    router.addRoute('/connect', ConnectPage);
    router.addRoute('/connect.html', ConnectPage);
    router.addRoute('/messages', MessagesPage);
    router.addRoute('/messages.html', MessagesPage);
    router.addRoute('/collaborate', CollaboratePage);
    router.addRoute('/collaborate.html', CollaboratePage);
    router.addRoute('/drawer', DrawerPage);
    router.addRoute('/drawer.html', DrawerPage);
    router.addRoute('/archive', ArchivePage);
    router.addRoute('/archive.html', ArchivePage);
    router.addRoute('/upload', UploadPage);
    router.addRoute('/upload.html', UploadPage);
    router.addRoute('/search', SearchPage);
    router.addRoute('/search.html', SearchPage);
    router.addRoute('/help', HelpPage);
    router.addRoute('/help.html', HelpPage);
    router.addRoute('/sitemap', SitemapPage);
    router.addRoute('/sitemap.html', SitemapPage);
    router.addRoute('/auth/login', LoginPage);
    router.addRoute('/auth/login.html', LoginPage);

    // Add a placeholder for the 404 page
    router.addRoute('/404', () => {
        const element = document.createElement('div');
        element.innerHTML = '<h2>404 - Page Not Found</h2><p>The page you are looking for does not exist.</p>';
        return element;
    });

    // Start the router to handle the initial page load and subsequent navigation.
    router.start();
}

// Run the main application function
main().catch(error => {
    console.error("Failed to initialize the application:", error);
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
        appRoot.innerHTML = '<h1>Error</h1><p>Could not load the application. Please try again later.</p>';
    }
});