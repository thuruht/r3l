import { Env } from '../types/env';
import { IRequest } from 'itty-router';
import { NotificationHandler } from './notification';

export class SuggestionHandler {
  private notificationHandler: NotificationHandler;

  constructor() {
    this.notificationHandler = new NotificationHandler();
  }

  /**
   * Get connection suggestions for a user
   * @param userId - The ID of the user to get suggestions for
   * @param env - The environment object
   * @returns A list of suggested user IDs
   */
  async getConnectionSuggestions(userId: string, env: Env): Promise<string[]> {
    try {
      // Find connections of the user's connections (2nd-degree connections)
      const suggestionsResult = await env.R3L_DB.prepare(
        `
        -- Find friends of friends
        SELECT DISTINCT c2.user_id
        FROM connections c1 -- User's direct connections
        JOIN connections c2 ON c1.connection_id = c2.user_id -- Friends of friends
        WHERE c1.user_id = ?
          -- Exclude the user themselves
          AND c2.user_id != ?
          -- Exclude users the user is already connected to
          AND c2.user_id NOT IN (
            SELECT connection_id FROM connections WHERE user_id = ?
          )
      `
      )
        .bind(userId, userId, userId)
        .all<{ user_id: string }>();

      if (!suggestionsResult.results) {
        return [];
      }

      const suggestedUserIds = suggestionsResult.results.map(row => row.user_id);

      return suggestedUserIds;
    } catch (error) {
      console.error('Error getting connection suggestions:', error);
      return [];
    }
  }

  /**
   * Create notifications for connection suggestions
   * @param request - The incoming request
   * @param env - The environment object
   */
  async createSuggestionNotifications(request: IRequest, env: Env): Promise<Response> {
    const { userId } = request.params;

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    try {
      const suggestions = await this.getConnectionSuggestions(userId, env);

      if (suggestions.length === 0) {
        return new Response(JSON.stringify({ message: 'No new suggestions found' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create notifications for each suggestion
      for (const suggestedUserId of suggestions) {
        const userResult = await env.R3L_DB.prepare(
          `SELECT display_name FROM users WHERE id = ?`
        )
          .bind(suggestedUserId)
          .first<{ display_name: string }>();

        const suggestedUserName = userResult?.display_name || 'a potential connection';

        await this.notificationHandler.createNotification(
          userId,
          'connection',
          'New Connection Suggestion',
          `You might know ${suggestedUserName}.`,
          `/profile.html?id=${suggestedUserId}`,
          env
        );
      }

      return new Response(
        JSON.stringify({
          message: `Created ${suggestions.length} suggestion notifications`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error creating suggestion notifications:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}
