import { Env } from '../types/env';

export class StatisticsHandler {
  constructor() {}

  /**
   * Get user stats
   * @param userId User ID to get stats for
   * @param env Environment
   * @returns User statistics
   */
  async getUserStats(userId: string, env: Env) {
    try {
      // Get contributions (total files)
      const contributionsResult = await env.R3L_DB.prepare(
        `
        SELECT COUNT(*) as count FROM content WHERE user_id = ?
      `
      )
        .bind(userId)
        .first<{ count: number }>();

      // Get drawers count
      const drawersResult = await env.R3L_DB.prepare(
        `
        SELECT COUNT(*) as count FROM drawers WHERE user_id = ?
      `
      )
        .bind(userId)
        .first<{ count: number }>();

      // Get connections count - using content associations as connections
      let connectionsResult;
      try {
        connectionsResult = await env.R3L_DB.prepare(
          `
          SELECT COUNT(*) as count FROM content_associations 
          WHERE content_id IN (SELECT id FROM content WHERE user_id = ?)
        `
        )
          .bind(userId)
          .first<{ count: number }>();
      } catch (error) {
        console.warn('Error counting connections, may not exist yet:', error);
        connectionsResult = { count: 0 };
      }

      return {
        contributions: contributionsResult?.count || 0,
        drawers: drawersResult?.count || 0,
        connections: connectionsResult?.count || 0,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        contributions: 0,
        drawers: 0,
        connections: 0,
      };
    }
  }

  /**
   * Get system stats (admin only)
   * @param env Environment
   * @returns System statistics
   */
  async getSystemStats(env: Env) {
    try {
      // Get total users
      const usersResult = await env.R3L_DB.prepare(
        `
        SELECT COUNT(*) as count FROM users
      `
      ).first<{ count: number }>();

      // Get total content
      const contentResult = await env.R3L_DB.prepare(
        `
        SELECT COUNT(*) as count FROM content
      `
      ).first<{ count: number }>();

      // Get total drawers
      const drawersResult = await env.R3L_DB.prepare(
        `
        SELECT COUNT(*) as count FROM drawers
      `
      ).first<{ count: number }>();

      return {
        users: usersResult?.count || 0,
        content: contentResult?.count || 0,
        drawers: drawersResult?.count || 0,
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        users: 0,
        content: 0,
        drawers: 0,
      };
    }
  }
}
