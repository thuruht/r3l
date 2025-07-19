import { Env } from '../types/env';

interface DrawerRecord {
  id: string;
  user_id: string;
  title: string;
  communique: string;
  theme: string;
  is_public: number;
  updated_at: number;
}

interface UserRecord {
  id: string;
  username: string;
  display_name: string;
  lurker_mode: number;
}

interface FileRecord {
  id: string;
  title: string;
  type: string;
  created_at: number;
  expires_at: number;
}

export class RandomDrawerHandler {
  async getRandomDrawer(request: Request, env: Env): Promise<Response> {
    try {
      // Find a random public drawer from a user not in lurker mode
      const randomDrawer = await env.R3L_DB.prepare(`
        SELECT d.id, d.user_id, d.title, d.communique, d.theme, d.updated_at, 
               u.username, u.display_name
        FROM drawers d
        JOIN users u ON d.user_id = u.id
        WHERE d.is_public = 1 AND u.lurker_mode = 0
        ORDER BY RANDOM()
        LIMIT 1
      `).first<DrawerRecord & UserRecord>();
      
      if (!randomDrawer) {
        return new Response('No public drawers found', { status: 404 });
      }
      
      // Get connection count for this user
      const connectionCountResult = await env.R3L_DB.prepare(`
        SELECT COUNT(*) as count
        FROM connections
        WHERE (user_id = ? OR connected_user_id = ?) AND status = 'active'
      `).bind(randomDrawer.user_id, randomDrawer.user_id).first<{ count: number }>();
      
      // Get recent public files from this user
      const recentFiles = await env.R3L_DB.prepare(`
        SELECT id, title, type, created_at, expires_at
        FROM content
        WHERE user_id = ? AND is_public = 1 AND archive_status = 'active'
        ORDER BY created_at DESC
        LIMIT 8
      `).bind(randomDrawer.user_id).all<FileRecord>();
      
      const now = Date.now();
      const processedFiles = (recentFiles.results || []).map(file => {
        // Calculate days until expiry
        const daysUntilExpiry = Math.ceil((file.expires_at - now) / (1000 * 60 * 60 * 24));
        
        return {
          id: file.id,
          title: file.title,
          type: file.type,
          expiresIn: daysUntilExpiry > 0 ? daysUntilExpiry : null
        };
      });
      
      return new Response(JSON.stringify({
        userId: randomDrawer.user_id,
        drawerId: randomDrawer.id,
        username: randomDrawer.display_name || randomDrawer.username,
        subtitle: randomDrawer.title || 'Public Drawer',
        communique: randomDrawer.communique || '',
        theme: randomDrawer.theme || 'default',
        connectionCount: connectionCountResult?.count || 0,
        recentFiles: processedFiles,
        lastUpdated: randomDrawer.updated_at
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Random drawer error:', error);
      return new Response(`Failed to get random drawer: ${error?.message || 'Unknown error'}`, { 
        status: 500 
      });
    }
  }
}
