import { Env } from './types/env';
import { Router } from './router';
import { ConnectionsObject, VisualizationObject, CollaborationRoom } from './collaboration';

// Create a new router instance
const router = new Router();

// Export Durable Object classes
export { ConnectionsObject, VisualizationObject, CollaborationRoom };

export default {
  /**
   * Handle fetch events (HTTP requests)
   * @param request The incoming request
   * @param env Environment bindings
   * @param ctx Execution context
   * @returns Response object
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // API requests go to the router
    if (path.startsWith('/api/')) {
      return router.route(request, env);
    }
    
    // For frontend requests, serve static assets
    return env.ASSETS.fetch(request);
  },
  
  /**
   * Handle scheduled events
   * @param event The scheduled event
   * @param env Environment bindings
   * @param ctx Execution context
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Process content expirations on schedule
    if (event.cron === '0 */6 * * *') { // Every 6 hours
      const contentLifecycle = router.contentLifecycle;
      ctx.waitUntil(contentLifecycle.processExpirations(env));
    }
  }
};

// Define the scheduled event interface
interface ScheduledEvent {
  cron: string;
  scheduled: boolean;
  type: string;
}
