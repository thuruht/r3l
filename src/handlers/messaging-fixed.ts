import { Env } from '../types/env';

/**
 * Message structure
 */
export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  isEncrypted: boolean;
  isRead: boolean;
  attachments?: string[];
  createdAt: number;
}

/**
 * Class to handle direct messaging between users
 * Uses Durable Objects for real-time capabilities
 */
export class MessagingHandler {
  constructor() {}

  /**
   * Send a direct message to a user
   * @param fromUserId Sender user ID
   * @param toUserId Recipient user ID
   * @param content Message content
   * @param attachments Optional array of attachment IDs/URLs
   * @param env Environment
   * @returns Message ID
   */
  async sendMessage(
    fromUserId: string,
    toUserId: string,
    content: string,
    attachments: string[] = [],
    env: Env
  ): Promise<string> {
    // Create a new message
    const messageId = crypto.randomUUID();
    const now = Date.now();
    const isEncrypted = false; // By default, not encrypted
    
    // Convert attachments to JSON string for storage
    const attachmentsJson = attachments && attachments.length > 0 
      ? JSON.stringify(attachments) 
      : null;
    
    // Store message in database
    await env.R3L_DB.prepare(`
      INSERT INTO direct_messages (
        id, from_user_id, to_user_id, content, is_encrypted, is_read, 
        attachments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId,
      fromUserId,
      toUserId,
      content,
      isEncrypted ? 1 : 0,
      0, // not read
      attachmentsJson,
      now
    ).run();
    
    // Create conversation record if it doesn't exist
    await this.ensureConversationExists(fromUserId, toUserId, env);
    
    // Update conversation's last message timestamp
    await env.R3L_DB.prepare(`
      UPDATE conversations
      SET last_message_id = ?, last_message_at = ?
      WHERE (user_id_a = ? AND user_id_b = ?) OR (user_id_a = ? AND user_id_b = ?)
    `).bind(
      messageId,
      now,
      fromUserId, toUserId,
      toUserId, fromUserId
    ).run();
    
    // Store in KV for quicker access
    await env.R3L_KV.put(
      `message:${messageId}`,
      JSON.stringify({
        id: messageId,
        fromUserId,
        toUserId,
        content,
        isEncrypted,
        attachments,
        isRead: false,
        createdAt: now
      }),
      { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
    );
    
    // Try to send real-time notification to recipient if they're online
    try {
      // Get the user's connection Durable Object
      const connectionsObj = env.R3L_CONNECTIONS.get(
        env.R3L_CONNECTIONS.idFromName(toUserId)
      );
      
      // Send message via internal fetch to the Durable Object
      await connectionsObj.fetch(new Request('https://internal/message', {
        method: 'POST',
        body: JSON.stringify({
          type: 'new_message',
          userId: toUserId,
          fromUserId,
          messageId,
          content: isEncrypted ? "[Encrypted Message]" : content,
          attachments,
          createdAt: now
        })
      }));
    } catch (error) {
      console.error('Error sending real-time message:', error);
      // Continue anyway, they'll see it when they check their messages
    }
    
    // Create a notification for the recipient
    const notificationTitle = `New message from ${fromUserId}`;
    const notificationContent = isEncrypted ? 
      "You have received an encrypted message" : 
      content.length > 50 ? content.substring(0, 50) + '...' : content;
    
    try {
      // Get notification handler
      const { NotificationHandler } = await import('./notification');
      const notificationHandler = new NotificationHandler();
      
      // Create notification
      await notificationHandler.createNotification(
        toUserId,
        'message',
        notificationTitle,
        notificationContent,
        `/messages?user=${fromUserId}`,
        env
      );
    } catch (error) {
      console.error('Error creating notification for message:', error);
    }
    
    return messageId;
  }
  
  /**
   * Ensure a conversation record exists between two users
   */
  private async ensureConversationExists(
    userIdA: string,
    userIdB: string,
    env: Env
  ): Promise<void> {
    // Sort user IDs alphabetically to ensure consistent conversation records
    const [first, second] = [userIdA, userIdB].sort();
    
    // Check if conversation exists
    const existingConversation = await env.R3L_DB.prepare(`
      SELECT id FROM conversations
      WHERE (user_id_a = ? AND user_id_b = ?) OR (user_id_a = ? AND user_id_b = ?)
    `).bind(
      userIdA, userIdB,
      userIdB, userIdA
    ).first<{ id: string }>();
    
    if (!existingConversation) {
      // Create new conversation
      const conversationId = crypto.randomUUID();
      const now = Date.now();
      
      await env.R3L_DB.prepare(`
        INSERT INTO conversations (
          id, user_id_a, user_id_b, created_at, last_message_at
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        conversationId,
        first, 
        second,
        now,
        now
      ).run();
    }
  }
  
  /**
   * Get messages between two users
   * @param userIdA First user ID
   * @param userIdB Second user ID
   * @param limit Max number of messages to return
   * @param beforeId Get messages before this ID (for pagination)
   * @param env Environment
   * @returns Array of messages
   */
  async getMessagesBetweenUsers(
    userIdA: string,
    userIdB: string,
    limit: number = 50,
    env: Env,
    beforeId?: string
  ): Promise<Message[]> {
    let query = `
      SELECT id, from_user_id, to_user_id, content, is_encrypted, is_read, attachments, created_at
      FROM direct_messages
      WHERE 
        (from_user_id = ? AND to_user_id = ?) OR
        (from_user_id = ? AND to_user_id = ?)
    `;
    
    const params: any[] = [userIdA, userIdB, userIdB, userIdA];
    
    // Add pagination if beforeId is provided
    if (beforeId) {
      const beforeMessage = await env.R3L_DB.prepare(`
        SELECT created_at FROM direct_messages WHERE id = ?
      `).bind(beforeId).first<{ created_at: number }>();
      
      if (beforeMessage) {
        query += ` AND created_at < ?`;
        params.push(beforeMessage.created_at);
      }
    }
    
    // Complete the query with ordering and limit
    query += `
      ORDER BY created_at DESC
      LIMIT ?
    `;
    params.push(limit);
    
    // Execute query
    const result = await env.R3L_DB.prepare(query).bind(...params).all<{
      id: string;
      from_user_id: string;
      to_user_id: string;
      content: string;
      is_encrypted: number;
      is_read: number;
      attachments: string | null;
      created_at: number;
    }>();
    
    // Map to expected output format
    return (result.results || []).map(msg => ({
      id: msg.id,
      fromUserId: msg.from_user_id,
      toUserId: msg.to_user_id,
      content: msg.content,
      isEncrypted: !!msg.is_encrypted,
      isRead: !!msg.is_read,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
      createdAt: msg.created_at
    }));
  }
  
  /**
   * Get user conversations
   * @param userId User ID
   * @param limit Max number of conversations to return
   * @param offset Offset for pagination
   * @param env Environment
   * @returns Array of conversations with latest message preview
   */
  async getUserConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<any[]> {
    const result = await env.R3L_DB.prepare(`
      SELECT 
        c.id,
        c.user_id_a,
        c.user_id_b,
        c.last_message_at,
        c.last_message_id,
        dm.content AS last_message_content,
        dm.is_encrypted AS last_message_encrypted,
        dm.from_user_id AS last_message_from,
        dm.attachments AS last_message_attachments
      FROM conversations c
      LEFT JOIN direct_messages dm ON c.last_message_id = dm.id
      WHERE c.user_id_a = ? OR c.user_id_b = ?
      ORDER BY c.last_message_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, userId, limit, offset).all<{
      id: string;
      user_id_a: string;
      user_id_b: string;
      last_message_at: number;
      last_message_id: string;
      last_message_content: string;
      last_message_encrypted: number;
      last_message_from: string;
      last_message_attachments: string | null;
    }>();
    
    const conversations = result.results || [];
    
    // Get unread counts for each conversation
    const conversationsWithCounts = await Promise.all(conversations.map(async conv => {
      // Determine the other user in the conversation
      const otherUserId = conv.user_id_a === userId ? conv.user_id_b : conv.user_id_a;
      
      // Get unread count
      const unreadResult = await env.R3L_DB.prepare(`
        SELECT COUNT(*) as count
        FROM direct_messages
        WHERE 
          to_user_id = ? AND
          from_user_id = ? AND
          is_read = 0
      `).bind(userId, otherUserId).first<{ count: number }>();
      
      // Format message preview
      let messagePreview = "";
      if (conv.last_message_content) {
        if (conv.last_message_encrypted) {
          messagePreview = "[Encrypted Message]";
        } else {
          // Truncate long messages
          messagePreview = conv.last_message_content.length > 50 
            ? conv.last_message_content.substring(0, 50) + '...'
            : conv.last_message_content;
        }
      }
      
      // Parse attachments if any
      let attachments = [];
      if (conv.last_message_attachments) {
        try {
          attachments = JSON.parse(conv.last_message_attachments);
        } catch (e) {
          console.error('Error parsing message attachments:', e);
        }
      }
      
      return {
        id: conv.id,
        otherUserId,
        lastMessageAt: conv.last_message_at,
        lastMessagePreview: messagePreview,
        hasAttachments: attachments.length > 0,
        attachmentsCount: attachments.length,
        isLastMessageEncrypted: !!conv.last_message_encrypted,
        isLastMessageFromMe: conv.last_message_from === userId,
        unreadCount: unreadResult?.count || 0
      };
    }));
    
    return conversationsWithCounts;
  }
  
  /**
   * Mark messages as read
   * @param userId Current user ID (recipient)
   * @param fromUserId Sender user ID
   * @param env Environment
   */
  async markMessagesAsRead(
    userId: string,
    fromUserId: string,
    env: Env
  ): Promise<void> {
    await env.R3L_DB.prepare(`
      UPDATE direct_messages
      SET is_read = 1
      WHERE to_user_id = ? AND from_user_id = ? AND is_read = 0
    `).bind(userId, fromUserId).run();
  }
  
  /**
   * Mark an entire conversation as read
   * @param userId Current user ID
   * @param conversationId Conversation ID
   * @param env Environment
   */
  async markConversationAsRead(
    userId: string,
    conversationId: string,
    env: Env
  ): Promise<void> {
    // First verify that this user is part of the conversation
    const conversation = await env.R3L_DB.prepare(`
      SELECT user_id_a, user_id_b FROM conversations
      WHERE id = ?
    `).bind(conversationId).first<{ user_id_a: string; user_id_b: string }>();
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.user_id_a !== userId && conversation.user_id_b !== userId) {
      throw new Error('Not authorized to access this conversation');
    }
    
    // Get the other user ID
    const otherUserId = conversation.user_id_a === userId 
      ? conversation.user_id_b 
      : conversation.user_id_a;
    
    // Mark all messages from the other user as read
    await this.markMessagesAsRead(userId, otherUserId, env);
  }
  
  /**
   * Get total unread message count for a user
   * @param userId User ID
   * @param env Environment
   * @returns Number of unread messages
   */
  async getUnreadMessageCount(userId: string, env: Env): Promise<number> {
    const result = await env.R3L_DB.prepare(`
      SELECT COUNT(*) as count
      FROM direct_messages
      WHERE to_user_id = ? AND is_read = 0
    `).bind(userId).first<{ count: number }>();
    
    return result?.count || 0;
  }
  
  /**
   * Delete a message (for the current user only)
   * @param userId Current user ID
   * @param messageId Message ID
   * @param env Environment
   */
  async deleteMessage(userId: string, messageId: string, env: Env): Promise<void> {
    // First, check if the user is involved in this message
    const message = await env.R3L_DB.prepare(`
      SELECT from_user_id, to_user_id FROM direct_messages
      WHERE id = ?
    `).bind(messageId).first<{ from_user_id: string; to_user_id: string }>();
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    if (message.from_user_id !== userId && message.to_user_id !== userId) {
      throw new Error('Not authorized to delete this message');
    }
    
    // Delete from the user's view (we'll use a deleted_for field to keep the message for the other user)
    if (message.from_user_id === userId) {
      await env.R3L_DB.prepare(`
        UPDATE direct_messages
        SET deleted_for_sender = 1
        WHERE id = ?
      `).bind(messageId).run();
    } else {
      await env.R3L_DB.prepare(`
        UPDATE direct_messages
        SET deleted_for_recipient = 1
        WHERE id = ?
      `).bind(messageId).run();
    }
  }
  
  /**
   * Get a conversation by ID
   * @param userId Current user ID
   * @param conversationId Conversation ID
   * @param env Environment
   * @returns Conversation data including other user details
   */
  async getConversationMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
    before?: string,
    env: Env
  ): Promise<any> {
    // First verify that this user is part of the conversation
    const conversation = await env.R3L_DB.prepare(`
      SELECT user_id_a, user_id_b FROM conversations
      WHERE id = ?
    `).bind(conversationId).first<{ user_id_a: string; user_id_b: string }>();
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.user_id_a !== userId && conversation.user_id_b !== userId) {
      throw new Error('Not authorized to access this conversation');
    }
    
    // Get the other user ID
    const otherUserId = conversation.user_id_a === userId 
      ? conversation.user_id_b 
      : conversation.user_id_a;
    
    // Get messages between the users
    const messages = await this.getMessagesBetweenUsers(
      userId,
      otherUserId,
      limit,
      env,
      before
    );
    
    // Mark messages as read
    await this.markMessagesAsRead(userId, otherUserId, env);
    
    // Get other user details
    const otherUser = await env.R3L_DB.prepare(`
      SELECT id, username, display_name, avatar_url FROM users
      WHERE id = ?
    `).bind(otherUserId).first();
    
    return {
      id: conversationId,
      otherUser,
      messages
    };
  }
}
