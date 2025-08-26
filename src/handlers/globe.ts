import { Env } from '../types/env';
import { RequestBatcher, BatchProcessor } from '../utils/request-batcher';
import { MemoryCache } from '../utils/memory-cache';

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

interface DataPointRequest {
  userId: string | null;
  bbox: BoundingBox | null;
  limit: number;
}

interface PointRequest {
  pointId: string;
  userId: string | null;
}

export class GlobeHandler {
  private dataPointsBatcher: RequestBatcher<DataPointRequest, GeoPoint[]>;
  private pointBatcher: RequestBatcher<PointRequest, GeoPoint | null>;
  private dataPointsCache: MemoryCache<string, GeoPoint[]>;
  private pointCache: MemoryCache<string, GeoPoint | null>;

  constructor() {
    // Initialize caches within the constructor
    this.dataPointsCache = new MemoryCache<string, GeoPoint[]>(5 * 60 * 1000); // 5 minutes
    this.pointCache = new MemoryCache<string, GeoPoint | null>(5 * 60 * 1000); // 5 minutes

    // Create batch processors
    const dataPointsProcessor: BatchProcessor<DataPointRequest, GeoPoint[]> = async (
      requests,
      env
    ) => {
      // Group requests by similar parameters to minimize DB queries
      const userGroups = new Map<string, DataPointRequest[]>();

      // Group requests by userId (null is treated as a separate group)
      for (const request of requests) {
        const key = request.userId || 'anonymous';
        if (!userGroups.has(key)) {
          userGroups.set(key, []);
        }
        userGroups.get(key)!.push(request);
      }

      const results: GeoPoint[][] = new Array(requests.length).fill([]);

      // Process each group with a single optimized query
      for (const [userId, groupRequests] of userGroups.entries()) {
        const actualUserId = userId === 'anonymous' ? null : userId;

        // Find the maximum limit to fetch enough points for all requests
        const maxLimit = Math.max(...groupRequests.map(req => req.limit));

        // Get all points for this user group
        const allPoints = await this.fetchDataPoints(maxLimit, null, actualUserId, env);

        // For each request in the group, filter the points based on its bounding box
        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          if (request.userId === actualUserId) {
            // If this request has a bounding box, filter points
            if (request.bbox) {
              results[i] = allPoints
                .filter(
                  point =>
                    point.latitude >= request.bbox!.minLat &&
                    point.latitude <= request.bbox!.maxLat &&
                    point.longitude >= request.bbox!.minLng &&
                    point.longitude <= request.bbox!.maxLng
                )
                .slice(0, request.limit);
            } else {
              // Otherwise, just limit the points
              results[i] = allPoints.slice(0, request.limit);
            }
          }
        }
      }

      return results;
    };

    const pointProcessor: BatchProcessor<PointRequest, GeoPoint | null> = async (requests, env) => {
      // Group requests by user ID to minimize DB queries
      const userGroups = new Map<string, PointRequest[]>();

      for (const request of requests) {
        const key = request.userId || 'anonymous';
        if (!userGroups.has(key)) {
          userGroups.set(key, []);
        }
        userGroups.get(key)!.push(request);
      }

      const results: (GeoPoint | null)[] = new Array(requests.length).fill(null);

      // Get unique point IDs across all requests
      const uniquePointIds = new Set<string>(requests.map(r => r.pointId));

      // Batch fetch all the points we need
      const points = await this.batchFetchPointsByIds(Array.from(uniquePointIds), env);

      // Create a map of point ID to point
      const pointMap = new Map<string, GeoPoint>();
      for (const point of points) {
        if (point) {
          pointMap.set(point.id, point);
        }
      }

      // For each request, check if the user has access to the point
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const point = pointMap.get(request.pointId);

        if (point) {
          // Check if user has access to this point
          if (point.isPublic || point.userId === request.userId) {
            results[i] = point;
          }
        }
      }

      return results;
    };

    // Initialize batchers
    this.dataPointsBatcher = new RequestBatcher<DataPointRequest, GeoPoint[]>(
      dataPointsProcessor.bind(this),
      25, // Process up to 25 requests at once
      100 // Or after 100ms
    );

    this.pointBatcher = new RequestBatcher<PointRequest, GeoPoint | null>(
      pointProcessor.bind(this),
      25, // Process up to 25 requests at once
      100 // Or after 100ms
    );
  }

  /**
   * Get data points for the map with request batching
   * If userId is provided, include private points for that user
   */
  async getDataPoints(
    limit: number = 100,
    bbox: BoundingBox | null = null,
    userId: string | null = null,
    env: Env
  ): Promise<GeoPoint[]> {
    // Clean up cache periodically
    this.dataPointsCache.cleanup();

    // Create cache key based on parameters
    const cacheKey = `data-points:${userId || 'anonymous'}:${limit}:${JSON.stringify(bbox)}`;

    // Check cache first
    const cachedResult = this.dataPointsCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Add to batch and get result
    const result = await this.dataPointsBatcher.add(
      {
        userId,
        bbox,
        limit,
      },
      env
    );

    // Store in cache
    this.dataPointsCache.set(cacheKey, result);

    return result;
  }

  /**
   * Private method to fetch data points from the database
   * This is used by the batch processor
   */
  private async fetchDataPoints(
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

      const result = await env.R3L_DB.prepare(query)
        .bind(...params)
        .all();

      // Transform the results to the GeoPoint type
      const points = result.results || [];
      return points.map(point => ({
        id: String(point.id),
        userId: String(point.user_id),
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        title: String(point.title),
        description: point.description ? String(point.description) : undefined,
        isPublic: Boolean(point.is_public),
        contentId: point.content_id ? String(point.content_id) : undefined,
        contentType: point.content_type ? String(point.content_type) : undefined,
        createdAt: Number(point.created_at),
        updatedAt: Number(point.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching geo points:', error);
      return [];
    }
  }

  /**
   * Get a specific point by ID with request batching
   * If userId is provided, allow access to private points owned by that user
   */
  async getPointById(
    pointId: string,
    userId: string | null = null,
    env: Env
  ): Promise<GeoPoint | null> {
    // Clean up cache periodically
    this.pointCache.cleanup();

    // Create cache key based on parameters
    const cacheKey = `point:${pointId}:${userId || 'anonymous'}`;

    // Check cache first
    const cachedResult = this.pointCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Add to batch and get result
    const result = await this.pointBatcher.add(
      {
        pointId,
        userId,
      },
      env
    );

    // Store in cache
    this.pointCache.set(cacheKey, result);

    return result;
  }

  /**
   * Private method to batch fetch points by their IDs
   */
  private async batchFetchPointsByIds(pointIds: string[], env: Env): Promise<(GeoPoint | null)[]> {
    if (pointIds.length === 0) {
      return [];
    }

    try {
      // Create a placeholders string for the SQL query
      const placeholders = pointIds.map(() => '?').join(', ');

      const query = `
        SELECT * FROM geo_points
        WHERE id IN (${placeholders})
      `;

      const result = await env.R3L_DB.prepare(query)
        .bind(...pointIds)
        .all();

      // Transform the results to the GeoPoint type
      const points = result.results || [];
      const transformedPoints = points.map(point => ({
        id: String(point.id),
        userId: String(point.user_id),
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        title: String(point.title),
        description: point.description ? String(point.description) : undefined,
        isPublic: Boolean(point.is_public),
        contentId: point.content_id ? String(point.content_id) : undefined,
        contentType: point.content_type ? String(point.content_type) : undefined,
        createdAt: Number(point.created_at),
        updatedAt: Number(point.updated_at),
      }));

      // Create a map of point ID to point
      const pointMap = new Map<string, GeoPoint>();
      for (const point of transformedPoints) {
        pointMap.set(point.id, point);
      }

      // Return points in the same order as the input IDs
      return pointIds.map(id => pointMap.get(id) || null);
    } catch (error) {
      console.error('Error batch fetching geo points:', error);
      return pointIds.map(() => null);
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

      await env.R3L_DB.prepare(
        `
        INSERT INTO geo_points (
          id, user_id, latitude, longitude, title, description, 
          is_public, content_id, content_type, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
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
        )
        .run();

      // Invalidate caches
      this.dataPointsCache.clear();

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
        updatedAt: now,
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
      await env.R3L_DB.prepare(
        `
        UPDATE geo_points
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `
      )
        .bind(...params)
        .run();

      // Invalidate caches
      this.dataPointsCache.clear();
      this.pointCache.delete(`point:${pointId}:null`);

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
      await env.R3L_DB.prepare(
        `
        DELETE FROM geo_points
        WHERE id = ?
      `
      )
        .bind(pointId)
        .run();

      // Invalidate caches
      this.dataPointsCache.clear();
      this.pointCache.delete(`point:${pointId}:null`);
    } catch (error) {
      console.error('Error deleting geo point:', error);
      throw new Error('Failed to delete geo point');
    }
  }
}
