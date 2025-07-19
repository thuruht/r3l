import { Env } from '../types/env';
import { ContentHandler } from './content';

interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
  authenticated: boolean;
}

interface CopyRequest {
  contentId: string;
  isPublic?: boolean;
}

export class DrawerCopyHandler {
  /**
   * Handle copying content to a user's drawer
   */
  async handleCopyToDrawer(request: AuthenticatedRequest, env: Env): Promise<Response> {
    try {
      // Only authenticated users can copy content
      if (!request.authenticated || !request.userId) {
        return new Response('Authentication required', { status: 401 });
      }
      
      // Parse the request JSON
      const data = await request.json() as CopyRequest;
      const { contentId, isPublic = false } = data;
      
      if (!contentId) {
        return new Response('Content ID is required', { status: 400 });
      }
      
      // Copy the content to the user's drawer
      const contentHandler = new ContentHandler();
      const copyId = await contentHandler.copyToDrawer(contentId, request.userId, isPublic, env);
      
      return new Response(JSON.stringify({
        success: true,
        copyId,
        message: 'Content copied to your drawer'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Copy to drawer error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  /**
   * Handle getting a random communique/user drawer
   */
  async handleRandomCommunique(_request: Request, env: Env): Promise<Response> {
    try {
      const contentHandler = new ContentHandler();
      const randomContent = await contentHandler.getRandomCommunique(env);
      
      if (!randomContent) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No public content available'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get user info for the drawer
      const user = await env.R3L_DB.prepare(`
        SELECT id, username, display_name FROM users WHERE id = ?
      `).bind(randomContent.user_id).first();
      
      return new Response(JSON.stringify({
        success: true,
        content: randomContent,
        user
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Random communique error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
