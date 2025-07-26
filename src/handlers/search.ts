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
import { Logger } from '../utils/logger';
import { ValidationError } from '../types/errors';
import { Validator } from '../validators';
import { Sanitizer } from '../utils/sanitizer';

export class SearchHandler {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('SearchHandler');
  }
  
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
      tags?: string[];
      dateRange?: { start?: number; end?: number };
      visibility?: 'public' | 'private' | 'both';
      userId?: string;
    } = {},
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<SearchResult[]> {
    // Sanitize and prepare search terms
    const sanitizedQuery = Sanitizer.sanitizeSearchQuery(query);
    const searchTerms = this.prepareSearchTerms(sanitizedQuery);
    
    if (searchTerms.length === 0 && !filters.type && !filters.category && !filters.tags) {
      return [];
    }
    
    // Build query conditions
    const conditions = [];
    const params: any[] = [];
    
    // Text search conditions - we'll use simple LIKE for basic search
    if (searchTerms.length > 0) {
      const searchConditions = searchTerms.map(() => 
        `(title LIKE ? OR description LIKE ? OR tags LIKE ?)`
      );
      
      // Add search terms to params (3 times each for title, description, tags)
      searchTerms.forEach(term => {
        params.push(`%${term}%`, `%${term}%`, `%${term}%`);
      });
      
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
    
    if (filters.tags && filters.tags.length > 0) {
      // Handle multiple tags with OR logic (any of the tags)
      const tagConditions = filters.tags.map(() => `tags LIKE ?`);
      conditions.push(`(${tagConditions.join(' OR ')})`);
      
      filters.tags.forEach(tag => {
        params.push(`%${tag}%`);
      });
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
    
    // Ensure content is active and not expired
    conditions.push(`archive_status = 'active'`);
    conditions.push(`(expires_at IS NULL OR expires_at > ?)`);
    params.push(Date.now());
    
    // Build the final query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Sort by relevance or recency
    const orderClause = 'ORDER BY created_at DESC';
    
    const query_sql = `
      SELECT 
        c.id, 
        c.title, 
        c.description, 
        c.type, 
        c.user_id, 
        c.created_at,
        c.tags,
        c.view_count,
        u.username,
        u.display_name,
        u.avatar_url
      FROM content c
      JOIN users u ON c.user_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    
    // Add pagination params
    params.push(limit, offset);
    
    try {
      // Execute query
      const result = await env.R3L_DB.prepare(query_sql).bind(...params).all<SearchResult>();
      
      const results = result.results || [];
      this.logger.debug('Basic search executed', { 
        query: sanitizedQuery, 
        resultCount: results.length,
        filters
      });
      
      return results;
    } catch (error) {
      this.logger.error('Error executing basic search', error as Error, { query: sanitizedQuery });
      throw error;
    }
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
      tags?: string[];
      dateRange?: { start?: number; end?: number };
      userId?: string;
    } = {},
    limit: number = 20,
    env: Env
  ): Promise<SearchResult[]> {
    // Validate search parameters
    const validation = Validator.validateSearch({ query, randomness, limit });
    if (!validation.valid) {
      throw new ValidationError(validation.errors?.join(', ') || 'Invalid search parameters');
    }
    
    // Ensure randomness is between 0-100
    const normalizedRandomness = Math.max(0, Math.min(100, randomness));
    
    // Get more results to allow for randomization
    const expandedLimit = Math.min(limit * 3, 100);
    
    // Get base results from regular search
    const baseResults = await this.basicSearch(
      query,
      { ...filters, visibility: 'public' },
      expandedLimit,
      0,
      env
    );
    
    // If results are fewer than requested limit or randomness is 0, return as-is
    if (baseResults.length <= limit || normalizedRandomness <= 0) {
      return baseResults.slice(0, limit);
    }
    
    // Calculate how many results to keep from original ranking
    const keepCount = Math.floor(limit * (1 - normalizedRandomness / 100));
    
    // Keep top results based on original ranking
    const topResults = baseResults.slice(0, keepCount);
    
    // Randomly select from remaining results
    const remainingResults = baseResults.slice(keepCount);
    const shuffledRemaining = this.secureShuffle(remainingResults);
    
    // Take random selections to fill the limit
    const randomResults = shuffledRemaining.slice(0, limit - keepCount);
    
    // Combine and return
    const combinedResults = [...topResults, ...randomResults];
    
    this.logger.debug('Lurker search executed', { 
      query, 
      randomness: normalizedRandomness,
      originalResultCount: baseResults.length,
      returnedCount: combinedResults.length,
      topKeepCount: keepCount
    });
    
    return combinedResults;
  }
  
  /**
   * Securely shuffle an array using crypto for true randomness
   */
  private secureShuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      // Use crypto for true randomness
      const randomValues = new Uint32Array(1);
      crypto.getRandomValues(randomValues);
      const j = randomValues[0] % (i + 1);
      
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
   * @param randomness Add randomness to the results (0-100)
   * @param env Environment bindings
   * @returns Array of location-based search results
   */
  async locationSearch(
    lat: number,
    lng: number,
    radius: number = 5,
    limit: number = 20,
    randomness: number = 0,
    env: Env
  ): Promise<SearchResult[]> {
    // Validate coordinates
    if (!Sanitizer.validateCoordinates(lat, lng)) {
      throw new ValidationError('Invalid coordinates');
    }
    
    // Simple approximation - 1 degree lat/lng is roughly 111km at the equator
    // This is a rough approximation but works for small distances
    const latRange = radius / 111;
    const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));
    
    const minLat = lat - latRange;
    const maxLat = lat + latRange;
    const minLng = lng - lngRange;
    const maxLng = lng + lngRange;
    
    // Get more results if randomness is enabled
    const expandedLimit = randomness > 0 ? Math.min(limit * 3, 100) : limit;
    
    try {
      const result = await env.R3L_DB.prepare(`
        SELECT 
          c.id, 
          c.title, 
          c.description, 
          c.type, 
          c.user_id, 
          c.created_at,
          c.tags,
          c.view_count,
          u.username,
          u.display_name,
          u.avatar_url,
          cl.lat,
          cl.lng,
          cl.location_name
        FROM content c
        JOIN content_location cl ON c.id = cl.content_id
        JOIN users u ON c.user_id = u.id
        WHERE cl.lat BETWEEN ? AND ?
        AND cl.lng BETWEEN ? AND ?
        AND c.is_public = 1
        AND c.archive_status = 'active'
        AND (c.expires_at IS NULL OR c.expires_at > ?)
        ORDER BY (
          (cl.lat - ?) * (cl.lat - ?) + 
          (cl.lng - ?) * (cl.lng - ?)
        ) ASC
        LIMIT ?
      `).bind(
        minLat, maxLat,
        minLng, maxLng,
        Date.now(),
        lat, lat, lng, lng,
        expandedLimit
      ).all<SearchResult & { lat: number; lng: number; location_name?: string }>();
      
      let results = result.results || [];
      
      // Apply randomness if specified
      if (randomness > 0 && results.length > limit) {
        // Keep some results based on distance
        const keepCount = Math.floor(limit * (1 - randomness / 100));
        const closestResults = results.slice(0, keepCount);
        
        // Randomly select from remaining results
        const remainingResults = results.slice(keepCount);
        const shuffledRemaining = this.secureShuffle(remainingResults);
        const randomResults = shuffledRemaining.slice(0, limit - keepCount);
        
        results = [...closestResults, ...randomResults];
      } else {
        results = results.slice(0, limit);
      }
      
      this.logger.debug('Location search executed', { 
        lat, 
        lng, 
        radius,
        resultCount: results.length,
        randomness
      });
      
      return results;
    } catch (error) {
      this.logger.error('Error executing location search', error as Error, { lat, lng, radius });
      throw error;
    }
  }
  
  /**
   * Get popular tags with their usage counts
   * @param limit Maximum number of tags
   * @param env Environment bindings
   * @returns Popular tags with counts
   */
  async getPopularTags(limit: number = 50, env: Env): Promise<TagWithCount[]> {
    try {
      // This is a simplified implementation
      // In a real system, we'd have a more sophisticated tag counting mechanism
      
      // Get all tags from content
      const result = await env.R3L_DB.prepare(`
        SELECT tags FROM content
        WHERE is_public = 1
        AND archive_status = 'active'
        AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY created_at DESC
        LIMIT 1000
      `).bind(Date.now()).all<{ tags: string }>();
      
      const contentTags = result.results || [];
      
      // Count tag occurrences
      const tagCounts = new Map<string, number>();
      
      for (const content of contentTags) {
        if (!content.tags) continue;
        
        const tags = content.tags.split(',').map(tag => tag.trim());
        for (const tag of tags) {
          if (!tag) continue;
          
          const count = tagCounts.get(tag) || 0;
          tagCounts.set(tag, count + 1);
        }
      }
      
      // Convert to array and sort by count
      const tagArray: TagWithCount[] = Array.from(tagCounts.entries())
        .map(([name, usage_count]) => ({ 
          id: crypto.randomUUID(), 
          name, 
          usage_count 
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);
      
      return tagArray;
    } catch (error) {
      this.logger.error('Error getting popular tags', error as Error);
      throw error;
    }
  }
  
  /**
   * Search for users
   * @param query Search query
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @param env Environment bindings
   * @returns User search results
   */
  async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<{ id: string; username: string; display_name: string; avatar_url?: string; bio?: string }[]> {
    // Sanitize query
    const sanitizedQuery = Sanitizer.sanitizeSearchQuery(query);
    
    try {
      const result = await env.R3L_DB.prepare(`
        SELECT id, username, display_name, avatar_url, bio
        FROM users
        WHERE (username LIKE ? OR display_name LIKE ?)
        AND active = 1
        ORDER BY 
          CASE WHEN username = ? THEN 0
               WHEN username LIKE ? THEN 1
               WHEN display_name = ? THEN 2
               WHEN display_name LIKE ? THEN 3
               ELSE 4
          END
        LIMIT ? OFFSET ?
      `).bind(
        `%${sanitizedQuery}%`,
        `%${sanitizedQuery}%`,
        sanitizedQuery,
        `${sanitizedQuery}%`,
        sanitizedQuery,
        `${sanitizedQuery}%`,
        limit,
        offset
      ).all();
      
      const results = result.results || [];
      
      // Ensure correct typing
      return results.map(user => ({
        id: String(user.id),
        username: String(user.username),
        display_name: String(user.display_name),
        avatar_url: user.avatar_url ? String(user.avatar_url) : undefined,
        bio: user.bio ? String(user.bio) : undefined
      }));
    } catch (error) {
      this.logger.error('Error searching users', error as Error, { query: sanitizedQuery });
      throw error;
    }
  }
}
