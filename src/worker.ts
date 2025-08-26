import { Env } from './types/env';
import { Router } from './router';
import { ConnectionsObject, VisualizationObject, CollaborationRoom } from './realtime';
import { validateEnvironment } from './utils/env-validator';
import { AppError } from './types/errors';

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
    try {
      // Validate environment variables
      const validatedEnv = validateEnvironment(env);

      // Create a router instance
      const router = new Router();

      // Pass the request to the router for processing
      // This handles API routes and static assets
      return router.handle(request, validatedEnv);
    } catch (error) {
      console.error('Worker error:', error);

      if (error instanceof AppError) {
        return new Response(
          JSON.stringify({
            error: error.code,
            message: error.message,
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },

  /**
   * Handle scheduled events
   * @param event The scheduled event
   * @param env Environment bindings
   * @param ctx Execution context
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      // Validate environment variables
      const validatedEnv = validateEnvironment(env);

      // Create a router instance
      const router = new Router();

      // Process content expirations on schedule
      if (event.cron === '0 */6 * * *') {
        // Every 6 hours
        console.log('Scheduled task triggered:', event.cron);

        // This is a placeholder for future content expiration logic
        // ctx.waitUntil(router.getContentHandler.processExpirations(validatedEnv));
      }
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  },
};

// Define the scheduled event interface
interface ScheduledEvent {
  cron: string;
  scheduled: boolean;
  type: string;
}
