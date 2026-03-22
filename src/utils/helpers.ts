// src/utils/helpers.ts
import { Context } from 'hono';
import { Env } from '../types';

/**
 * Gets the admin user ID from environment or defaults to 1.
 */
export const getAdminId = (env: Env): number => {
    return parseInt(env.ADMIN_USER_ID || '1');
};

/**
 * --- Rate Limiting Helper ---
 */
export async function checkRateLimit(c: Context<{ Bindings: Env }>, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const kvKey = `ratelimit:${key}:${ip}`;
  
  try {
    const current = await c.env.KV.get(kvKey);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit) {
      return false;
    }
    
    // Increment
    await c.env.KV.put(kvKey, (count + 1).toString(), { expirationTtl: windowSeconds });
    return true;
  } catch (e) {
    console.error("Rate limit check failed", e);
    // Fail open if KV is down to avoid blocking legit users
    return true; 
  }
}

/**
 * --- R2 Helper ---
 */
export function getR2PublicUrl(env: Env, r2_key: string): string {
    // If a custom R2 public domain is configured (e.g., via wrangler.toml vars or secrets), use it.
    if (env.R2_PUBLIC_DOMAIN) {
      return `https://${env.R2_PUBLIC_DOMAIN}/${r2_key}`;
    }

    // Fallback: not a valid public R2.dev URL without a custom domain.
    console.warn('R2_PUBLIC_DOMAIN not set; R2 public URLs will not resolve correctly.');
    return `/${r2_key}`;
}
