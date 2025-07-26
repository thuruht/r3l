/**
 * Rate Limiter for R3L:F
 * 
 * This middleware implements rate limiting to protect APIs from abuse
 * Uses a combination of memory cache and KV storage for distributed rate limiting
 */

import { Env } from '../types/env';
import { MemoryCache } from '../utils/memory-cache';

// Interface for rate limit configuration
export interface RateLimitConfig {
  // Maximum number of requests in the window
  maxRequests: number;
  
  // Time window in milliseconds
  windowMs: number;
  
  // Whether to block requests that exceed the limit
  blockExceedingRequests: boolean;
  
  // Message to return when limit is exceeded
  message?: string;
  
  // Custom key generator function
  keyGenerator?: (request: Request) => string;
  
  // Whether to include headers with rate limit info
  includeHeaders: boolean;
}

// Interface for rate limit result
export interface RateLimitResult {
  // Whether the request should be allowed
  allowed: boolean;
  
  // Headers to add to the response
  headers: Record<string, string>;
  
  // Current limit information
  limitInfo: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// Default rate limit configuration
const defaultConfig: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  blockExceedingRequests: true,
  message: 'Too many requests, please try again later',
  includeHeaders: true
};

/**
 * In-memory store for rate limiting
 * For small-scale applications or single-worker deployments
 */
export class MemoryRateLimiter {
  private cache: MemoryCache<string, { count: number, resetTime: number }>;
  private config: RateLimitConfig;
  
  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.cache = new MemoryCache<string, { count: number, resetTime: number }>(
      this.config.windowMs * 2 // TTL is twice the window to ensure we clean up properly
    );
  }
  
  /**
   * Check if a request is allowed by the rate limiter
   * @param request The request to check
   * @returns Whether the request is allowed and rate limit headers
   */
  async check(request: Request): Promise<RateLimitResult> {
    // Generate a key for this request
    const key = this.getKey(request);
    
    // Get the current timestamp
    const now = Date.now();
    
    // Get the current count and reset time for this key
    let record = this.cache.get(key);
    
    // If no record exists or the reset time has passed, create a new one
    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
    }
    
    // Increment the count
    record.count++;
    
    // Store the updated record
    this.cache.set(key, record, this.config.windowMs * 2);
    
    // Calculate remaining requests
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    
    // Check if the request should be allowed
    const allowed = record.count <= this.config.maxRequests;
    
    // Build headers
    const headers: Record<string, string> = {};
    
    if (this.config.includeHeaders) {
      headers['X-RateLimit-Limit'] = this.config.maxRequests.toString();
      headers['X-RateLimit-Remaining'] = remaining.toString();
      headers['X-RateLimit-Reset'] = Math.ceil(record.resetTime / 1000).toString(); // in seconds
      
      if (!allowed) {
        headers['Retry-After'] = Math.ceil((record.resetTime - now) / 1000).toString(); // in seconds
      }
    }
    
    return {
      allowed: allowed || !this.config.blockExceedingRequests,
      headers,
      limitInfo: {
        limit: this.config.maxRequests,
        remaining,
        reset: Math.ceil(record.resetTime / 1000)
      }
    };
  }
  
  /**
   * Generate a key for a request
   * @param request The request to generate a key for
   * @returns A key for the request
   */
  private getKey(request: Request): string {
    // If a custom key generator is provided, use it
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }
    
    // Otherwise, use the IP address and the URL path
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    return `rate-limit:${ip}:${url.pathname}`;
  }
}

/**
 * KV-backed rate limiter for distributed environments
 * For multi-worker deployments
 */
export class KVRateLimiter {
  private config: RateLimitConfig;
  
  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Check if a request is allowed by the rate limiter
   * @param request The request to check
   * @param env Environment with KV binding
   * @returns Whether the request is allowed and rate limit headers
   */
  async check(request: Request, env: Env): Promise<RateLimitResult> {
    // Generate a key for this request
    const key = this.getKey(request);
    
    // Get the current timestamp
    const now = Date.now();
    
    // Get the current record from KV
    let record: { count: number, resetTime: number } | null = null;
    
    try {
      const kvRecord = await env.R3L_KV.get(key);
      if (kvRecord) {
        record = JSON.parse(kvRecord) as { count: number, resetTime: number };
      }
    } catch (error) {
      console.error('Error getting rate limit record from KV:', error);
    }
    
    // If no record exists or the reset time has passed, create a new one
    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
    }
    
    // Increment the count
    record.count++;
    
    // Store the updated record in KV
    try {
      await env.R3L_KV.put(key, JSON.stringify(record), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000) * 2 // in seconds
      });
    } catch (error) {
      console.error('Error storing rate limit record in KV:', error);
    }
    
    // Calculate remaining requests
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    
    // Check if the request should be allowed
    const allowed = record.count <= this.config.maxRequests;
    
    // Build headers
    const headers: Record<string, string> = {};
    
    if (this.config.includeHeaders) {
      headers['X-RateLimit-Limit'] = this.config.maxRequests.toString();
      headers['X-RateLimit-Remaining'] = remaining.toString();
      headers['X-RateLimit-Reset'] = Math.ceil(record.resetTime / 1000).toString(); // in seconds
      
      if (!allowed) {
        headers['Retry-After'] = Math.ceil((record.resetTime - now) / 1000).toString(); // in seconds
      }
    }
    
    return {
      allowed: allowed || !this.config.blockExceedingRequests,
      headers,
      limitInfo: {
        limit: this.config.maxRequests,
        remaining,
        reset: Math.ceil(record.resetTime / 1000)
      }
    };
  }
  
  /**
   * Generate a key for a request
   * @param request The request to generate a key for
   * @returns A key for the request
   */
  private getKey(request: Request): string {
    // If a custom key generator is provided, use it
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }
    
    // Otherwise, use the IP address and the URL path
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    return `rate-limit:${ip}:${url.pathname}`;
  }
}

/**
 * Rate limit middleware for requests
 * @param request The request to check
 * @param env Environment with KV binding
 * @param config Rate limit configuration
 * @returns Response if rate limit exceeded, null otherwise
 */
export async function rateLimit(
  request: Request, 
  env: Env,
  config: Partial<RateLimitConfig> = {}
): Promise<Response | null> {
  // Use KV rate limiter if in production, memory otherwise
  const rateLimiter = env.R3L_KV 
    ? new KVRateLimiter(config)
    : new MemoryRateLimiter(config);
  
  // Check if the request is allowed
  const result = await rateLimiter.check(request, env);
  
  // If the request is allowed, return null
  if (result.allowed) {
    return null;
  }
  
  // Otherwise, return a 429 response
  const message = config.message || defaultConfig.message;
  return new Response(message, {
    status: 429,
    headers: {
      'Content-Type': 'text/plain',
      ...result.headers
    }
  });
}

/**
 * Create rate limit middleware functions for specific API groups
 * @param env Environment with KV binding
 * @returns Object with rate limit functions for different API groups
 */
export function createRateLimiters(env: Env) {
  return {
    // General API rate limit: 100 requests per minute
    api: (request: Request) => rateLimit(request, env, {
      maxRequests: 100,
      windowMs: 60 * 1000,
      keyGenerator: (req) => {
        const url = new URL(req.url);
        const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
        return `rate-limit:api:${ip}`;
      }
    }),
    
    // Authentication rate limit: 10 attempts per minute
    auth: (request: Request) => rateLimit(request, env, {
      maxRequests: 10,
      windowMs: 60 * 1000,
      keyGenerator: (req) => {
        const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
        return `rate-limit:auth:${ip}`;
      }
    }),
    
    // Content creation rate limit: 30 requests per minute
    contentCreation: (request: Request) => rateLimit(request, env, {
      maxRequests: 30,
      windowMs: 60 * 1000,
      keyGenerator: (req) => {
        const url = new URL(req.url);
        const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
        return `rate-limit:content:${ip}`;
      }
    }),
    
    // File uploads rate limit: 20 requests per minute
    fileUploads: (request: Request) => rateLimit(request, env, {
      maxRequests: 20,
      windowMs: 60 * 1000,
      keyGenerator: (req) => {
        const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
        return `rate-limit:uploads:${ip}`;
      }
    }),
    
    // User actions rate limit: 50 requests per minute
    userActions: (request: Request) => rateLimit(request, env, {
      maxRequests: 50,
      windowMs: 60 * 1000,
      keyGenerator: (req) => {
        const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
        return `rate-limit:user:${ip}`;
      }
    }),
    
    // Custom rate limiter with specific config
    custom: (request: Request, config: Partial<RateLimitConfig>) => 
      rateLimit(request, env, config)
  };
}
