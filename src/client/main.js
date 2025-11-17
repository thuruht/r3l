import router from './router.js';

/**
 * Main application entry point.
 */
function main() {
    console.log("SPA entry point loaded. Initializing application.");
    router.resolve();
}

// Run the main application function
main();
