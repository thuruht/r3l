import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Set the root to our new client-side source directory
  root: 'src/client',
  server: {
    // This will proxy any requests starting with /api to your backend worker.
    // This allows you to run the frontend dev server and the worker simultaneously.
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // Default port for `wrangler dev`
        changeOrigin: true,
      },
    },
  },
  build: {
    // This is the output directory for the production build.
    outDir: '../../dist',
    emptyOutDir: true,
  },
});