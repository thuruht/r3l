# Deployment Guide

## Prerequisites

- Node.js 18+ 
- Wrangler CLI 3.x (stable version)
- Cloudflare account with Workers Paid plan (required for D1, R2, Durable Objects)

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Authenticate Wrangler
```bash
npx wrangler login
```

### 3. Create Cloudflare Resources

#### D1 Database
```bash
npx wrangler d1 create r3l-db
```
Update `wrangler.jsonc` with the returned database ID.

#### R2 Bucket
```bash
npx wrangler r2 bucket create r3l-content
```

#### KV Namespaces
```bash
npx wrangler kv:namespace create "R3L_KV"
npx wrangler kv:namespace create "R3L_SESSIONS" 
npx wrangler kv:namespace create "R3L_USER_EMBEDDINGS"
npx wrangler kv:namespace create "R3L_USERS"
```
Update `wrangler.jsonc` with the returned namespace IDs.

### 4. Initialize Database
```bash
npx wrangler d1 execute r3l-db --file=./db/schema.sql
```

## Configuration

### Environment Variables
Set these in `wrangler.jsonc` under `vars`:

- `ALLOWED_ORIGINS`: Your domain (e.g., "https://r3l.example.com")
- `CONTENT_EXPIRATION_DAYS`: Content lifetime (default: 30)
- `MAX_UPLOAD_SIZE`: Max file size in bytes (default: 10485760 = 10MB)
- `RATE_LIMIT_REQUESTS`: Requests per window (default: 100)
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds (default: 60)

### Compatibility Settings
- `compatibility_date`: "2025-09-26" (current as of September 2025)
- `compatibility_flags`: Use `nodejs_compat` (automatically enables `nodejs_compat_v2` for 2025 dates)
- Wrangler 3.91.0+ supports both JSON and TOML config (JSON recommended for new projects)

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run deploy
```

## Post-Deployment

### 1. Verify Services
- Test API endpoints: `/api/content`, `/api/login`
- Check D1 connectivity: Query users table
- Verify R2 uploads: Test file upload flow
- Confirm Durable Objects: Access `/api/network`

### 2. Monitor Performance
- Use Cloudflare Analytics dashboard
- Monitor Worker CPU time and memory usage
- Track D1 query performance
- Watch R2 bandwidth usage

### 3. Security Checklist
- Verify CORS origins are properly configured
- Test rate limiting functionality
- Confirm User-Agent validation in auth
- Check file upload size limits

## Troubleshooting

### Common Issues

**"No such table" errors**: Run database migrations
```bash
npx wrangler d1 execute r3l-db --file=./db/schema.sql
```

**R2 permission errors**: Ensure bucket exists and Worker has R2 permissions

**Durable Object errors**: Check migrations are applied and classes are exported

**Rate limit issues**: Verify KV namespace bindings are correct

### Performance Optimization

- Use D1 prepared statements (already implemented)
- Cache frequently accessed data in KV
- Optimize R2 operations with proper error handling
- Monitor Durable Object memory usage

## Monitoring

### Key Metrics
- Worker invocations and errors
- D1 query latency and errors  
- R2 request volume and errors
- KV read/write operations
- Durable Object CPU time

### Alerts
Set up alerts for:
- Worker error rate > 1%
- D1 query failures
- R2 4xx/5xx errors
- High CPU usage in Durable Objects