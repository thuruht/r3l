import { Env } from './types/env.js';
import { Router } from './router.js';
import { ConnectionsObject, VisualizationObject, CollaborationRoom } from './realtime-fixed.js';

// Export Durable Object classes
export { ConnectionsObject, VisualizationObject, CollaborationRoom };

// Main Worker entrypoint using standard fetch handler
export default {
  /**
   * Handle fetch events (HTTP requests)
   * @param request The incoming request
   * @param env Environment bindings
   * @param ctx Execution context
   * @returns Response object
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Create a router instance
    const router = new Router();

    // Pass the request to the router for processing
    // This handles API routes and static assets
    return router.handle(request, env);
  },

  /**
   * Handle scheduled events
   * @param event The scheduled event
   * @param env Environment bindings
   * @param ctx Execution context
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Create a router instance
    const router = new Router();

    // Process content expirations on schedule
    if (event.cron === '0 */6 * * *') {
      // Every 6 hours
      // For now, log the scheduled event
      console.log('Scheduled task triggered:', event.cron);
    }
  },
};

// Define the scheduled event interface
interface ScheduledEvent {
  cron: string;
  scheduled: boolean;
  type: string;
}
