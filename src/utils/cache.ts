/**
 * Cache manager for R3L:F
 * 
 * Provides methods for caching database query results
 */
import { Env } from '../types/env';

/**
 * Cache manager class
 */
export class CacheManager {
  private cache: KVNamespace;
  private defaultTTL: number = 300; // 5 minutes
  
  /**
   * Create a cache manager
   * @param cache KV namespace to use for caching
   */
  constructor(cache: KVNamespace) {
    this.cache = cache;
  }
  
  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cache.get(key, 'json');
      return cached as T;
    } catch {
      return null;
    }
  }
  
  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.put(key, JSON.stringify(value), {
      expirationTtl: ttl || this.defaultTTL
    });
  }
  
  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }
  
  /**
   * Cache with automatic key generation
   * @param keyPrefix Prefix for cache key
   * @param keyParams Parameters to include in key
   * @param fetcher Function to fetch data if not in cache
   * @param ttl Time to live in seconds
   * @returns Cached or fresh data
   */
  async cached<T>(
    keyPrefix: string,
    keyParams: any[],
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Generate a cache key
    const key = `${keyPrefix}:${keyParams.map(p => JSON.stringify(p)).join(':')}`;
    
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch fresh data
    const fresh = await fetcher();
    
    // Cache the result
    await this.set(key, fresh, ttl);
    
    return fresh;
  }
  
  /**
   * Create a wrapper around database queries that automatically caches results
   * @param env Environment with DB access
   * @returns Object with methods for cached DB operations
   */
  createDbCache(env: Env) {
    const self = this;
    
    return {
      /**
       * Execute a cached query that returns a single row
       * @param prefix Cache key prefix
       * @param query SQL query
       * @param params Query parameters
       * @param ttl TTL in seconds
       * @returns Query result
       */
      async first<T>(
        prefix: string,
        query: string,
        params: any[] = [],
        ttl?: number
      ): Promise<T | null> {
        return self.cached<T | null>(
          `${prefix}:first`,
          [query, ...params],
          async () => {
            const result = await env.R3L_DB.prepare(query)
              .bind(...params)
              .first<T>();
            
            return result || null;
          },
          ttl
        );
      },
      
      /**
       * Execute a cached query that returns multiple rows
       * @param prefix Cache key prefix
       * @param query SQL query
       * @param params Query parameters
       * @param ttl TTL in seconds
       * @returns Query results
       */
      async all<T>(
        prefix: string,
        query: string,
        params: any[] = [],
        ttl?: number
      ): Promise<T[]> {
        return self.cached<T[]>(
          `${prefix}:all`,
          [query, ...params],
          async () => {
            const result = await env.R3L_DB.prepare(query)
              .bind(...params)
              .all<T>();
            
            return result.results || [];
          },
          ttl
        );
      },
      
      /**
       * Invalidate cache for a specific prefix
       * @param prefix Cache key prefix to invalidate
       */
      async invalidate(prefix: string): Promise<void> {
        // List keys with prefix
        const keys = await self.cache.list({ prefix });
        
        // Delete all matching keys
        for (const key of keys.keys) {
          await self.cache.delete(key.name);
        }
      }
    };
  }
}
