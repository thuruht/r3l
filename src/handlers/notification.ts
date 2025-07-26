import { Env } from '../types/env';

export interface Notification {
  id: string;
  userId: string;
  type: 'system' | 'connection' | 'content' | 'message';
  title: string;
  content: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: number;
}

export class NotificationHandler {
  constructor() {}
  
  /**
   * Create a new notification for a user
   */
  async createNotification(
    userId: string,
    type: 'system' | 'connection' | 'content' | 'message',
    title: string,
    content: string,
    actionUrl: string | null,
    env: Env
  ): Promise<string> {
    const notificationId = crypto.randomUUID();
    const now = Date.now();
    
    await env.R3L_DB.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, action_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      notificationId,
      userId,
      type,
      title,
      content,
      actionUrl || null,
      0, // not read
      now
    ).run();
    
    // Trigger real-time notification if user is online
    try {
      const connectionsObj = env.R3L_CONNECTIONS.get(
        env.R3L_CONNECTIONS.idFromName(userId)
      );
      
      await connectionsObj.fetch(new Request('https://internal/notify', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          notification: {
            id: notificationId,
            type,
            title,
            content,
            actionUrl,
            createdAt: now
          }
        })
      }));
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Continue anyway, they'll see it next time they load the page
    }
    
    return notificationId;
  }
  
  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<Notification[]> {
    const result = await env.R3L_DB.prepare(`
      SELECT id, user_id, type, title, content, action_url, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all<Notification>();
    
    return result.results || [];
  }
  
  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, env: Env): Promise<number> {
    const result = await env.R3L_DB.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).bind(userId).first<{ count: number }>();
    
    return result?.count || 0;
  }
  
  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[], env: Env): Promise<void> {
    // Create placeholders for SQL query
    const placeholders = notificationIds.map(() => '?').join(', ');
    
    await env.R3L_DB.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND id IN (${placeholders})
    `).bind(userId, ...notificationIds).run();
  }
  
  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ?
    `).bind(userId).run();
  }
  
  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(`
      DELETE FROM notifications
      WHERE user_id = ? AND id = ?
    `).bind(userId, notificationId).run();
  }
}
