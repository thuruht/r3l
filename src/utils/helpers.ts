// src/utils/helpers.ts
import { Context } from 'hono';
import { Env } from '../types';

// Types that browsers can execute as scripts when served inline.
// These are remapped to text/plain so they download safely instead of running.
// SVG stays as image/svg+xml (legitimate image format); the serving layer
// applies Content-Disposition: attachment for all non-PDF files.
const EXTENSION_MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
  avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma', opus: 'audio/opus',
  mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
  mov: 'video/quicktime', wmv: 'video/x-ms-wmv', mkv: 'video/x-matroska',
  flv: 'video/x-flv', m4v: 'video/mp4', '3gp': 'video/3gpp',
  pdf: 'application/pdf', json: 'application/json', xml: 'application/xml',
  zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
  rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed',
  csv: 'text/csv', md: 'text/markdown', txt: 'text/plain',
  // Script types remapped to plain text — prevents execution if served inline
  html: 'text/plain', css: 'text/plain',
  js: 'text/plain', ts: 'text/plain', py: 'text/plain',
};

export function mimeTypeFromExtension(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? EXTENSION_MIME_MAP[ext] ?? null : null;
}

// MIME types that browsers will execute as scripts; must never be stored verbatim.
const DANGEROUS_BROWSER_MIME = new Set([
  'text/html', 'application/xhtml+xml',
  'application/javascript', 'text/javascript', 'application/x-javascript',
  'application/ecmascript', 'text/ecmascript',
]);

// Rewrite any browser-executable MIME type to a safe download type.
// Called on both the browser-supplied file.type and extension-derived values.
export function sanitizeMime(mime: string): string {
  return DANGEROUS_BROWSER_MIME.has(mime.toLowerCase().split(';')[0].trim())
    ? 'application/octet-stream'
    : mime;
}

/**
 * Gets the admin user ID from environment or defaults to 1.
 */
export const getAdminId = (env: Env): number => {
    return parseInt(env.ADMIN_USER_ID || '1');
};

/**
 * --- Rate Limiting Helper ---
 */
export async function checkRateLimit(c: any, key: string, limit: number, windowSeconds: number): Promise<boolean> {
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
    // Deliberate fail-open: blocking all traffic during a KV outage is worse
    // than allowing some burst. ALERT-level log so on-call notices the bypass.
    console.error('[SECURITY] Rate limit KV unavailable — bypassing limit for key:', key, e);
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
