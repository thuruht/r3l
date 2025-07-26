import { Env } from '../types/env';

export interface GeoPoint {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  isPublic: boolean;
  contentId?: string;
  contentType?: string;
  createdAt: number;
  updatedAt: number;
}

interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export class GlobeHandler {
  constructor() {}
  
  /**
   * Get data points for the map
   * If userId is provided, include private points for that user
   */
  async getDataPoints(
    limit: number = 100,
    bbox: BoundingBox | null = null,
    userId: string | null = null,
    env: Env
  ): Promise<GeoPoint[]> {
    try {
      // Base query to get public points
      let query = `
        SELECT * FROM geo_points 
        WHERE is_public = 1
      `;
      
      const params: any[] = [];
      
      // If user is authenticated, include their private points
      if (userId) {
        query = `
          SELECT * FROM geo_points 
          WHERE is_public = 1 OR user_id = ?
        `;
        params.push(userId);
      }
      
      // Add bounding box filter if provided
      if (bbox) {
        query += ` 
          AND latitude >= ? AND latitude <= ? 
          AND longitude >= ? AND longitude <= ?
        `;
        params.push(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng);
      }
      
      // Add limit and order
      query += ` 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      params.push(limit);
      
      const result = await env.R3L_DB.prepare(query).bind(...params).all();
      return result.results as GeoPoint[] || [];
    } catch (error) {
      console.error('Error fetching geo points:', error);
      return [];
    }
  }
  
  /**
   * Get a specific point by ID
   * If userId is provided, allow access to private points owned by that user
   */
  async getPointById(
    pointId: string,
    userId: string | null = null,
    env: Env
  ): Promise<GeoPoint | null> {
    try {
      let query = `
        SELECT * FROM geo_points
        WHERE id = ? AND (is_public = 1 
      `;
      
      const params: any[] = [pointId];
      
      // If user is authenticated, include their private points
      if (userId) {
        query += ` OR user_id = ?`;
        params.push(userId);
      }
      
      query += `)`;
      
      const result = await env.R3L_DB.prepare(query).bind(...params).first();
      return result as GeoPoint || null;
    } catch (error) {
      console.error('Error fetching geo point:', error);
      return null;
    }
  }
  
  /**
   * Add a new data point
   */
  async addDataPoint(
    userId: string,
    data: {
      latitude: number;
      longitude: number;
      title: string;
      description?: string;
      isPublic?: boolean;
      contentId?: string;
      contentType?: string;
    },
    env: Env
  ): Promise<GeoPoint> {
    try {
      const pointId = crypto.randomUUID();
      const now = Date.now();
      
      // Set default values
      const isPublic = data.isPublic ?? true;
      
      await env.R3L_DB.prepare(`
        INSERT INTO geo_points (
          id, user_id, latitude, longitude, title, description, 
          is_public, content_id, content_type, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        pointId,
        userId,
        data.latitude,
        data.longitude,
        data.title,
        data.description || null,
        isPublic ? 1 : 0,
        data.contentId || null,
        data.contentType || null,
        now,
        now
      ).run();
      
      // Return the newly created point
      return {
        id: pointId,
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
        title: data.title,
        description: data.description,
        isPublic: !!isPublic,
        contentId: data.contentId,
        contentType: data.contentType,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      console.error('Error adding geo point:', error);
      throw new Error('Failed to add geo point');
    }
  }
  
  /**
   * Update an existing data point
   */
  async updateDataPoint(
    pointId: string,
    data: {
      latitude?: number;
      longitude?: number;
      title?: string;
      description?: string;
      isPublic?: boolean;
      contentId?: string;
      contentType?: string;
    },
    env: Env
  ): Promise<GeoPoint | null> {
    try {
      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const params: any[] = [];
      
      // Add each field that needs to be updated
      if (data.latitude !== undefined) {
        updateFields.push('latitude = ?');
        params.push(data.latitude);
      }
      
      if (data.longitude !== undefined) {
        updateFields.push('longitude = ?');
        params.push(data.longitude);
      }
      
      if (data.title !== undefined) {
        updateFields.push('title = ?');
        params.push(data.title);
      }
      
      if (data.description !== undefined) {
        updateFields.push('description = ?');
        params.push(data.description === null ? null : data.description);
      }
      
      if (data.isPublic !== undefined) {
        updateFields.push('is_public = ?');
        params.push(data.isPublic ? 1 : 0);
      }
      
      if (data.contentId !== undefined) {
        updateFields.push('content_id = ?');
        params.push(data.contentId === null ? null : data.contentId);
      }
      
      if (data.contentType !== undefined) {
        updateFields.push('content_type = ?');
        params.push(data.contentType === null ? null : data.contentType);
      }
      
      // Always update the updated_at timestamp
      const now = Date.now();
      updateFields.push('updated_at = ?');
      params.push(now);
      
      // Add the point ID to params
      params.push(pointId);
      
      // If no fields to update, return the original point
      if (updateFields.length === 0) {
        return this.getPointById(pointId, null, env);
      }
      
      // Execute the update
      await env.R3L_DB.prepare(`
        UPDATE geo_points
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `).bind(...params).run();
      
      // Return the updated point
      return this.getPointById(pointId, null, env);
    } catch (error) {
      console.error('Error updating geo point:', error);
      throw new Error('Failed to update geo point');
    }
  }
  
  /**
   * Delete a data point
   */
  async deleteDataPoint(pointId: string, env: Env): Promise<void> {
    try {
      await env.R3L_DB.prepare(`
        DELETE FROM geo_points
        WHERE id = ?
      `).bind(pointId).run();
    } catch (error) {
      console.error('Error deleting geo point:', error);
      throw new Error('Failed to delete geo point');
    }
  }
}
