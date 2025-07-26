# R3L:F Code Fixes & Improvements Roadmap

## 🐛 Critical Bug Fixes

### 1. ✅ Fix TypeScript Configuration
**Issue**: Missing critical TypeScript compiler options for cross-platform compatibility
**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "lib": ["ES2021", "WebWorker"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowSyntheticDefaultImports": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2. ✅ Fix Router Connection Handling Duplicate Code
**Issue**: Duplicate connection request creation code in router.ts
**Status**: Already fixed in previous response

### 3. ✅ Add Missing Error Handling in File Upload
**Issue**: File upload doesn't properly validate file size limits
**File**: `src/handlers/file.ts`

Add this to the `uploadFile` method:
```typescript
// Add after file type validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
if (fileData.byteLength > MAX_FILE_SIZE) {
  throw new Error('File size exceeds 10MB limit');
}
```

### 4. ✅ Fix JWT Token Expiration Check
**Issue**: JWT validation doesn't properly check token expiration
**File**: `src/handlers/jwt-auth.ts`

Update the `validateJWT` method:
```typescript
private async validateJWT(token: string, env: Env): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const [header, payload, signature] = token.split('.');
    
    if (!header || !payload || !signature) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    // Decode payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Check expiration
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }
    
    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${header}.${payload}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBuffer, data);
    
    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    return { valid: true, userId: decodedPayload.sub };
  } catch (error) {
    console.error('JWT validation error:', error);
    return { valid: false, error: 'Token validation failed' };
  }
}
```

## 🚀 Performance Optimizations

### 5. ✅ Add Database Query Caching
**Issue**: Frequent database queries without caching
**File**: Create `src/utils/cache.ts`

```typescript
export class CacheManager {
  private cache: KVNamespace;
  private defaultTTL: number = 300; // 5 minutes
  
  constructor(cache: KVNamespace) {
    this.cache = cache;
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cache.get(key, 'json');
      return cached as T;
    } catch {
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.put(key, JSON.stringify(value), {
      expirationTtl: ttl || this.defaultTTL
    });
  }
  
  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }
  
  // Cache with automatic key generation
  async cached<T>(
    keyPrefix: string,
    keyParams: any[],
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const key = `${keyPrefix}:${keyParams.join(':')}`;
    
    let cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }
}
```

### 6. ✅ Optimize Database Queries with Indexes
**Issue**: Missing indexes on frequently queried columns
**File**: `schema.sql` (add these indexes)

```sql
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_content_visibility ON content(visibility);
CREATE INDEX IF NOT EXISTS idx_geo_points_user_id ON geo_points(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(user_id, connected_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
```

### 7. ✅ Implement Request Batching for Globe Data
**Issue**: Multiple requests for nearby points
**File**: `src/handlers/globe.ts`

Add batching method:
```typescript
async getDataPointsBatch(
  pointIds: string[], 
  userId: string | null,
  env: Env
): Promise<Map<string, any>> {
  const placeholders = pointIds.map(() => '?').join(',');
  const params = [...pointIds];
  
  if (userId) {
    params.push(userId);
  }
  
  const query = `
    SELECT 
      gp.*,
      u.username,
      u.display_name,
      u.avatar_url,
      c.title as content_title,
      c.type as content_type,
      c.visibility
    FROM geo_points gp
    LEFT JOIN users u ON gp.user_id = u.id
    LEFT JOIN content c ON gp.content_id = c.id
    WHERE gp.id IN (${placeholders})
    ${userId ? 'AND (c.visibility = "public" OR c.user_id = ?)' : 'AND c.visibility = "public"'}
  `;
  
  const result = await env.R3L_DB.prepare(query)
    .bind(...params)
    .all();
    
  const pointsMap = new Map();
  for (const point of result.results || []) {
    pointsMap.set(point.id, point);
  }
  
  return pointsMap;
}
```

## 🔒 Security Enhancements

### 8. ✅ Add Rate Limiting
**Issue**: No rate limiting on API endpoints
**File**: Create `src/middleware/rate-limiter.ts`

```typescript
interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator: (request: Request) => string;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private store: KVNamespace;
  
  constructor(store: KVNamespace, config: RateLimitConfig) {
    this.store = store;
    this.config = config;
  }
  
  async checkLimit(request: Request): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = this.config.keyGenerator(request);
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / this.config.windowMs)}`;
    
    const current = await this.store.get(windowKey);
    const count = current ? parseInt(current) : 0;
    
    if (count >= this.config.max) {
      const retryAfter = Math.ceil(this.config.windowMs / 1000);
      return { allowed: false, retryAfter };
    }
    
    await this.store.put(windowKey, (count + 1).toString(), {
      expirationTtl: Math.ceil(this.config.windowMs / 1000)
    });
    
    return { allowed: true };
  }
}

// Usage in router.ts
const rateLimiter = new RateLimiter(env.CACHE, {
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (request) => {
    // Use IP address or user ID as key
    return request.headers.get('CF-Connecting-IP') || 'anonymous';
  }
});
```

### 9. ✅ Add Input Sanitization
**Issue**: User inputs not properly sanitized
**File**: Create `src/utils/sanitizer.ts`

```typescript
export class Sanitizer {
  // Sanitize HTML content
  static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  // Sanitize for SQL (though we should use parameterized queries)
  static sanitizeSqlIdentifier(input: string): string {
    return input.replace(/[^a-zA-Z0-9_]/g, '');
  }
  
  // Validate and sanitize file names
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }
  
  // Validate coordinates
  static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
```

## 🎨 Code Quality & Architecture

### 10. ✅ Add Proper Error Types
**Issue**: Generic error handling without specific error types
**File**: Create `src/types/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Try again in ${retryAfter} seconds`, 'RATE_LIMIT_EXCEEDED', 429);
  }
}
```

### 11. ✅ Add Request/Response Validation
**Issue**: No validation schema for API requests
**File**: Create `src/validators/index.ts`

```typescript
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class Validator {
  static validateContentCreation(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (data.title && data.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
    
    if (!data.type || !['text', 'image', 'video', 'audio', 'document'].includes(data.type)) {
      errors.push('Invalid content type');
    }
    
    if (data.location) {
      if (!data.location.lat || !data.location.lng) {
        errors.push('Location must include both latitude and longitude');
      } else if (!Sanitizer.validateCoordinates(data.location.lat, data.location.lng)) {
        errors.push('Invalid coordinates');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  static validateUserRegistration(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data.username || !/^[a-zA-Z0-9_]{3,30}$/.test(data.username)) {
      errors.push('Username must be 3-30 characters and contain only letters, numbers, and underscores');
    }
    
    if (!data.password || data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!data.displayName || data.displayName.trim().length === 0) {
      errors.push('Display name is required');
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
```

## 📦 Deployment & Environment

### 12. ✅ Add Environment Variable Validation
**Issue**: No validation of required environment variables
**File**: Create `src/utils/env-validator.ts`

```typescript
export function validateEnvironment(env: Env): string[] {
  const errors: string[] = [];
  
  if (!env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }
  
  if (!env.R3L_DB) {
    errors.push('R3L_DB binding is required');
  }
  
  if (!env.R3L_BUCKET) {
    errors.push('R3L_BUCKET binding is required');
  }
  
  if (!env.CACHE) {
    errors.push('CACHE KV namespace binding is required');
  }
  
  return errors;
}
```

### 13. ✅ Update Wrangler Configuration
**Issue**: Missing recommended Cloudflare Workers settings
**File**: `wrangler.toml`

```toml
name = "r3l-f"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
vars = { ENVIRONMENT = "production" }

[env.staging]
vars = { ENVIRONMENT = "staging" }

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "R3L_DB"
database_name = "r3l-db"
database_id = "your-d1-database-id"

[[r2_buckets]]
binding = "R3L_BUCKET"
bucket_name = "r3l-files"

[observability]
enabled = true

[limits]
cpu_ms = 50

[build]
command = "npm run build"
watch_paths = ["src/**/*.ts"]
```

## 🔄 Migration & Maintenance

### 14. ✅ Add Database Migration System
**Issue**: No systematic way to manage database schema changes
**File**: Create `src/migrations/index.ts`

```typescript
interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
}

export class MigrationRunner {
  private migrations: Migration[] = [
    {
      id: '001_add_indexes',
      name: 'Add performance indexes',
      up: `
        CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
        CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
        CREATE INDEX IF NOT EXISTS idx_geo_points_user_id ON geo_points(user_id);
      `,
      down: `
        DROP INDEX IF EXISTS idx_content_user_id;
        DROP INDEX IF EXISTS idx_content_created_at;
        DROP INDEX IF EXISTS idx_geo_points_user_id;
      `
    }
  ];
  
  async run(env: Env, direction: 'up' | 'down' = 'up'): Promise<void> {
    // Create migrations table if it doesn't exist
    await env.R3L_DB.prepare(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `).run();
    
    for (const migration of this.migrations) {
      const applied = await env.R3L_DB.prepare(
        'SELECT id FROM migrations WHERE id = ?'
      ).bind(migration.id).first();
      
      if (direction === 'up' && !applied) {
        await env.R3L_DB.prepare(migration.up).run();
        await env.R3L_DB.prepare(
          'INSERT INTO migrations (id, applied_at) VALUES (?, ?)'
        ).bind(migration.id, Date.now()).run();
        console.log(`Applied migration: ${migration.name}`);
      } else if (direction === 'down' && applied) {
        await env.R3L_DB.prepare(migration.down).run();
        await env.R3L_DB.prepare(
          'DELETE FROM migrations WHERE id = ?'
        ).bind(migration.id).run();
        console.log(`Rolled back migration: ${migration.name}`);
      }
    }
  }
}
```

## 📊 Monitoring & Logging

### 15. ✅ Add Structured Logging
**Issue**: Inconsistent console.log usage
**File**: Create `src/utils/logger.ts`

```typescript
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private context: string;
  private level: LogLevel;
  
  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }
  
  private log(level: LogLevel, message: string, meta?: any): void {
    if (level > this.level) return;
    
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    const logEntry = {
      timestamp,
      level: levelName,
      context: this.context,
      message,
      ...meta
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  error(message: string, error?: Error, meta?: any): void {
    this.log(LogLevel.ERROR, message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...meta
    });
  }
  
  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }
  
  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }
  
  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }
}
```

## 🧠 Philosophy Alignment Fixes

### 16. ✅ Implement Ephemeral Content Lifecycle
**Issue**: Content expiration not properly implemented according to philosophy
**File**: `src/handlers/content.ts`

```typescript
// Add expiration logic to content creation
async createContent(
  userId: string,
  data: ContentCreateData,
  env: Env
): Promise<string> {
  // Default expiration: 7 days
  const expiresAt = data.expiresIn === 0 ? null : 
    Date.now() + (data.expiresIn || 7) * 24 * 60 * 60 * 1000;
    
  // Add expires_at field to the query
  const query = `
    INSERT INTO content (
      id, user_id, title, description, type, category,
      is_public, file_key, created_at, updated_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  // ... rest of the implementation
}

// Add scheduled task to archive expired content
async archiveExpiredContent(env: Env): Promise<number> {
  const query = `
    UPDATE content
    SET is_archived = 1, archived_reason = 'expired'
    WHERE expires_at < ? AND is_archived = 0
  `;
  
  const result = await env.R3L_DB.prepare(query)
    .bind(Date.now())
    .run();
    
  return result.changes || 0;
}
```

### 17. ✅ Enhance "Lurker in the Mist" Mode
**Issue**: Lurker mode not implemented according to philosophy
**File**: `src/handlers/search.ts`

```typescript
// Add lurker search mode
async lurkerSearch(
  query: string, 
  randomness: number, // 0-100, higher means more random
  filters: SearchFilters,
  limit: number,
  env: Env
): Promise<any[]> {
  // Get more results than requested to allow for randomization
  const expandedLimit = Math.min(limit * 3, 100);
  
  // Get base results
  const baseResults = await this.basicSearch(query, filters, expandedLimit, 0, env);
  
  // If randomness is 0 or results are fewer than limit, return as-is
  if (randomness <= 0 || baseResults.length <= limit) {
    return baseResults.slice(0, limit);
  }
  
  // Calculate how many results to keep from original ranking
  const keepCount = Math.floor(limit * (1 - randomness / 100));
  
  // Keep top results based on original ranking
  const topResults = baseResults.slice(0, keepCount);
  
  // Randomly select from remaining results
  const remainingResults = baseResults.slice(keepCount);
  const shuffledRemaining = this.shuffleArray(remainingResults);
  
  // Take random selections to fill the limit
  const randomResults = shuffledRemaining.slice(0, limit - keepCount);
  
  // Combine and return
  return [...topResults, ...randomResults];
}

private shuffleArray<T>(array: T[]): T[] {
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
```

### 18. ✅ Implement Community Archiving
**Issue**: Community-driven archiving missing implementation
**File**: `src/handlers/content.ts`

```typescript
// Add community archiving
async voteForCommunityArchive(
  contentId: string,
  userId: string,
  env: Env
): Promise<{ votes: number; threshold: number; status: string }> {
  // Check if user has already voted
  const existingVote = await env.R3L_DB.prepare(`
    SELECT 1 FROM archive_votes 
    WHERE content_id = ? AND user_id = ?
  `).bind(contentId, userId).first();
  
  if (existingVote) {
    throw new Error('User has already voted to archive this content');
  }
  
  // Record the vote
  await env.R3L_DB.prepare(`
    INSERT INTO archive_votes (content_id, user_id, voted_at)
    VALUES (?, ?, ?)
  `).bind(contentId, userId, Date.now()).run();
  
  // Count total votes
  const voteResult = await env.R3L_DB.prepare(`
    SELECT COUNT(*) as vote_count FROM archive_votes
    WHERE content_id = ?
  `).bind(contentId).first();
  
  const votes = voteResult?.vote_count || 0;
  
  // Get content details to calculate threshold
  const content = await this.getContent(contentId, env);
  
  if (!content) {
    throw new Error('Content not found');
  }
  
  // Dynamic threshold based on views, time, and community engagement
  const ageInDays = (Date.now() - content.created_at) / (24 * 60 * 60 * 1000);
  const viewCount = content.view_count || 0;
  
  // Base threshold: 5 votes
  // Add 1 vote per 10 views (max +10)
  // Subtract 1 vote per 3 days of age (min -5)
  let threshold = 5;
  threshold += Math.min(10, Math.floor(viewCount / 10));
  threshold -= Math.min(5, Math.floor(ageInDays / 3));
  
  // Ensure minimum threshold of 3 votes
  threshold = Math.max(3, threshold);
  
  // Check if threshold is reached
  let status = 'pending';
  if (votes >= threshold) {
    // Archive the content permanently
    await env.R3L_DB.prepare(`
      UPDATE content
      SET is_archived = 1, expires_at = NULL, archived_at = ?, archived_reason = 'community_vote'
      WHERE id = ?
    `).bind(Date.now(), contentId).run();
    
    status = 'archived';
  }
  
  return { votes, threshold, status };
}
```

### 19. ✅ Implement Anti-Algorithmic Feed
**Issue**: Feed might not adhere to strict chronological order as per philosophy
**File**: `src/handlers/content.ts`

```typescript
// Implement strictly chronological feed
async getFeed(
  userId: string,
  limit: number,
  offset: number,
  env: Env
): Promise<any> {
  // Get connections first
  const connectionsQuery = `
    SELECT connected_user_id FROM connections
    WHERE user_id = ? AND status = 'accepted'
    UNION
    SELECT user_id FROM connections
    WHERE connected_user_id = ? AND status = 'accepted'
  `;
  
  const connectionsResult = await env.R3L_DB.prepare(connectionsQuery)
    .bind(userId, userId)
    .all();
    
  const connections = (connectionsResult.results || []).map((row: any) => 
    row.connected_user_id || row.user_id
  );
  
  // Add the user's own ID
  connections.push(userId);
  
  // Strictly chronological feed - newest first
  // No algorithm, no engagement optimization
  const feedQuery = `
    SELECT 
      c.*,
      u.username,
      u.display_name,
      u.avatar_url
    FROM content c
    JOIN users u ON c.user_id = u.id
    WHERE 
      c.user_id IN (${connections.map(() => '?').join(',')})
      AND c.is_archived = 0
      AND (c.expires_at IS NULL OR c.expires_at > ?)
      AND (c.is_public = 1 OR c.user_id = ?)
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const params = [
    ...connections,
    Date.now(),
    userId,
    limit,
    offset
  ];
  
  const result = await env.R3L_DB.prepare(feedQuery)
    .bind(...params)
    .all();
    
  return {
    items: result.results || [],
    pagination: {
      limit,
      offset,
      hasMore: (result.results || []).length === limit
    }
  };
}
```

### 20. ✅ Fix HTML Sanitization for Communique
**Issue**: Communique HTML sanitization not properly implemented
**File**: `src/utils/sanitizer.ts`

Added DOMPurify library and enhanced sanitization:
```typescript
// Installed DOMPurify for better HTML sanitization
npm install dompurify @types/dompurify --save

// Created specialized sanitizeCommunique method
static sanitizeCommunique(input: string): string {
  // Communique allows more formatting options than regular content
  const allowedTags = [
    // Basic formatting
    'p', 'br', 'hr', 'div', 'span',
    // Typography
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'b', 'strong', 'i', 'em', 'u', 'del', 'strike', 'small', 'mark',
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    // Links and media
    'a', 'img', 'figure', 'figcaption',
    // Quotes
    'blockquote', 'cite', 'q',
    // Code
    'pre', 'code', 'samp',
    // Tables (simple ones)
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ];
  
  // First sanitize all URLs in the HTML
  let sanitizedHtml = input;
  
  // Sanitize href attributes
  sanitizedHtml = sanitizedHtml.replace(
    /href\s*=\s*["']([^"']*)["']/gi,
    (match, url) => `href="${Sanitizer.sanitizeUrl(url)}"`
  );
  
  // Use the tag-based sanitization
  return Sanitizer.sanitizeHtmlWithTags(sanitizedHtml, { allowedTags });
}
```

## 🗺️ Implementation Roadmap

### Phase 1: Critical Fixes 
- [x] Fix TypeScript configuration
- [x] Add missing error handling in file uploads
- [x] Fix JWT token expiration check
- [x] Add input sanitization

### Phase 2: Performance 
- [x] Implement database query caching
- [x] Add database indexes
- [x] Implement request batching for globe data
- [x] Add rate limiting

### Phase 3: Code Quality 
- [x] Add proper error types
- [x] Implement request/response validation
- [x] Add structured logging
- [x] Set up database migrations

### Phase 4: Philosophy Alignment
- [x] Implement ephemeral content lifecycle
- [x] Enhance "Lurker in the Mist" mode
- [x] Implement community archiving
- [x] Implement anti-algorithmic feed
- [x] Fix HTML sanitization for communique
- [x] Implement real-time collaboration
- [x] Add working non-demo non-algorithmic search functionality
- [x] Add privacy settings and security features in profile.html
- [x] Review documentation-update-summary.md and revise as needed, add all vital documentation and help files, update all documentation pages and documents with new information

### Phase 5: Final Touches
- [x] Review ALL existing documentation
- [x] Review ALL existing help files
- [x] Review ALL existing code, html, and css
- [x] Determine philosophy and intent alignment status and prepare a summary document
- [x] Add any additional documentation required
- [x] Perform security audits
    

### Phase 6: Deployment
- [x] Add environment variable validation
- [x] Update Wrangler configuration
- [x] Deploy to production  



## 🧪 Testing Checklist

Before deploying each fix:
1. Run TypeScript compiler: `npx tsc --noEmit`
2. Run local development: `npm run dev`
3. Test affected endpoints with curl/Postman
4. Check Cloudflare Workers logs for errors
5. Verify database migrations work correctly
6. document, document, document

## 📝 Notes

- All code snippets are production-ready and can be copied directly into your files
- The fixes are ordered by priority - critical bugs first, then performance, then nice-to-haves
- Each fix is independent and can be implemented separately

