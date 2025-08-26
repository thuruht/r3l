/**
 * In-memory cache for R3L:F
 *
 * Simple in-memory cache implementation for use when KV namespace is not available
 */

interface CacheEntry<T> {
  value: T;
  expires: number | null;
}

/**
 * In-memory cache manager
 */
export class MemoryCache<K extends string | number, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private defaultTTL: number;

  /**
   * Create a memory cache
   * @param defaultTTL Default time to live in milliseconds
   */
  constructor(defaultTTL: number = 300000) {
    // 5 minutes by default
    this.defaultTTL = defaultTTL;

    // Don't set interval in constructor to avoid global scope issues
    // Cleanup will be called manually when appropriate
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (entry.expires !== null && entry.expires < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (use null for no expiration)
   */
  set(key: K, value: V, ttl: number | null = null): void {
    const expires = ttl === null ? null : Date.now() + ttl;

    this.cache.set(key, {
      value,
      expires,
    });
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  delete(key: K): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove all expired entries from the cache
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires !== null && entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}
