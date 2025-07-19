import { Env } from '../types/env';
import { 
  SearchRequest, 
  SearchResult,
  SearchResultWithMeta,
  FileRecord,
  FileRecordWithMeta,
  FileType,
  TagWithCount,
  PopularTagsResponse
} from '../types/search';

export class SearchHandler {
  /**
   * Perform a basic text search without algorithmic manipulation
   * @param query Search query text
   * @param filters Optional filters to apply
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @param env Environment bindings
   * @returns Array of search results
   */
  async basicSearch(
    query: string,
    filters: {
      type?: string[];
      category?: string[];
      dateRange?: { start?: number; end?: number };
      visibility?: 'public' | 'private' | 'both';
      userId?: string;
    } = {},
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<SearchResult[]> {
    // Sanitize and prepare search terms
    const searchTerms = this.prepareSearchTerms(query);
    if (searchTerms.length === 0) {
      return [];
    }
    
    // Build query conditions
    let conditions = [];
    const params: any[] = [];
    
    // Text search conditions - we'll use simple LIKE for basic search
    const searchConditions = searchTerms.map(() => 
      `(title LIKE ? OR description LIKE ? OR tags LIKE ?)`
    );
    
    // Add search terms to params (3 times each for title, description, tags)
    searchTerms.forEach(term => {
      params.push(`%${term}%`, `%${term}%`, `%${term}%`);
    });
    
    if (searchConditions.length > 0) {
      conditions.push(`(${searchConditions.join(' OR ')})`);
    }
    
    // Apply filters
    if (filters.type && filters.type.length > 0) {
      const placeholders = filters.type.map(() => '?').join(',');
      conditions.push(`type IN (${placeholders})`);
      params.push(...filters.type);
    }
    
    if (filters.category && filters.category.length > 0) {
      const placeholders = filters.category.map(() => '?').join(',');
      conditions.push(`category IN (${placeholders})`);
      params.push(...filters.category);
    }
    
    if (filters.dateRange) {
      if (filters.dateRange.start) {
        conditions.push('created_at >= ?');
        params.push(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        conditions.push('created_at <= ?');
        params.push(filters.dateRange.end);
      }
    }
    
    // Visibility filter
    if (filters.visibility === 'public') {
      conditions.push('is_public = 1');
    } else if (filters.visibility === 'private' && filters.userId) {
      conditions.push('(is_public = 0 AND user_id = ?)');
      params.push(filters.userId);
    } else if (filters.visibility === 'both' && filters.userId) {
      conditions.push('(is_public = 1 OR user_id = ?)');
      params.push(filters.userId);
    } else {
      // Default to public
      conditions.push('is_public = 1');
    }
    
    // Build the final query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Randomize result order when full-random mode is enabled
    // Otherwise do a simple recency sort
    const orderClause = 'ORDER BY created_at DESC';
    
    const query_sql = `
      SELECT id, title, description, type, user_id, created_at
      FROM content
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    
    // Add pagination params
    params.push(limit, offset);
    
    // Execute query
    const result = await env.R3L_DB.prepare(query_sql).bind(...params).all<SearchResult>();
    
    return result.results || [];
  }
  
  /**
   * Perform a lurker-in-the-mist search with randomized results
   * @param query Search query text
   * @param randomness How random the results should be (0-100)
   * @param filters Optional filters to apply
   * @param limit Maximum number of results
   * @param env Environment bindings
   * @returns Array of search results with randomized order
   */
  async lurkerSearch(
    query: string,
    randomness: number = 50,
    filters: {
      type?: string[];
      category?: string[];
      dateRange?: { start?: number; end?: number };
    } = {},
    limit: number = 20,
    env: Env
  ): Promise<SearchResult[]> {
    // Ensure randomness is between 0-100
    const normalizedRandomness = Math.max(0, Math.min(100, randomness));
    
    // Get base results from regular search
    const baseResults = await this.basicSearch(
      query,
      { ...filters, visibility: 'public' },
      limit * 2, // Get more results to shuffle
      0,
      env
    );
    
    if (baseResults.length === 0) {
      return [];
    }
    
    // Apply randomness
    if (normalizedRandomness > 0) {
      // At 100% randomness, completely shuffle results
      // At 0% randomness, keep original order
      // In between, partially shuffle by weighted sampling
      
      if (normalizedRandomness === 100) {
        // Complete shuffle
        this.shuffleArray(baseResults);
      } else if (normalizedRandomness > 0) {
        // Partial reordering - higher randomness means more chaos
        for (let i = 0; i < baseResults.length; i++) {
          // Add some random relevance score influenced by randomness factor
          baseResults[i].relevance = (i * (100 - normalizedRandomness) / 100) + 
                                   (Math.random() * normalizedRandomness);
        }
        
        // Sort by the new relevance scores
        baseResults.sort((a, b) => (a.relevance || 0) - (b.relevance || 0));
      }
    }
    
    // Trim to requested limit
    return baseResults.slice(0, limit);
  }
  
  /**
   * Helper method to shuffle an array in-place
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  /**
   * Prepare search terms by sanitizing and splitting query
   */
  private prepareSearchTerms(query: string): string[] {
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    // Split by spaces, remove empty strings, and sanitize
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.trim().length > 0)
      .map(term => term.trim())
      // Filter out common words and very short terms
      .filter(term => term.length > 2 && !['the', 'and', 'for', 'with'].includes(term));
  }
  
  /**
   * Perform a location-based search for geo-tagged content
   * @param lat Latitude
   * @param lng Longitude
   * @param radius Search radius in kilometers
   * @param limit Maximum number of results
   * @param env Environment bindings
   * @returns Array of location-based search results
   */
  async locationSearch(
    lat: number,
    lng: number,
    radius: number = 5,
    limit: number = 20,
    env: Env
  ): Promise<SearchResult[]> {
    // Simple approximation - 1 degree lat/lng is roughly 111km at the equator
    // This is a very rough approximation but works for small distances
    const latRange = radius / 111;
    const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));
    
    const minLat = lat - latRange;
    const maxLat = lat + latRange;
    const minLng = lng - lngRange;
    const maxLng = lng + lngRange;
    
    const result = await env.R3L_DB.prepare(`
      SELECT c.id, c.title, c.description, c.type, c.user_id, c.created_at
      FROM content c
      JOIN content_location cl ON c.id = cl.content_id
      WHERE cl.lat BETWEEN ? AND ?
      AND cl.lng BETWEEN ? AND ?
      AND c.is_public = 1
      ORDER BY (
        (cl.lat - ?) * (cl.lat - ?) + 
        (cl.lng - ?) * (cl.lng - ?)
      ) ASC
      LIMIT ?
    `).bind(
      minLat, maxLat,
      minLng, maxLng,
      lat, lat, lng, lng,
      limit
    ).all<SearchResult>();
    
    return result.results || [];
  }
}
