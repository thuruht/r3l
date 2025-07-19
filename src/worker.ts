import { Env } from './types/env';
import { Router } from './router';
import { ConnectionsObject, VisualizationObject, CollaborationRoom } from './collaboration';
import { createOAuthProvider, setupOAuthClients } from './auth/oauth-provider';

// Export Durable Object classes
export { ConnectionsObject, VisualizationObject, CollaborationRoom };

// Create the OAuth provider
export default {
  /**
   * Handle fetch events (HTTP requests)
   * @param request The incoming request
   * @param env Environment bindings
   * @param ctx Execution context
   * @returns Response object
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Set up OAuth clients if needed
    ctx.waitUntil(setupOAuthClients(env));
    
    // Create and use the OAuth provider
    const oauthProvider = createOAuthProvider(env);
    return oauthProvider.fetch(request, env, ctx);
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
