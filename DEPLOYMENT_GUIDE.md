# R3L:F Beta Deployment Guide

## Prerequisites

1. **Cloudflare Account** with Workers, D1, R2, and KV enabled
2. **Wrangler CLI** installed and authenticated
3. **Node.js** 18+ installed
4. **Domain** configured in Cloudflare (optional but recommended)

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Wrangler
```bash
wrangler login
```

### 3. Create Cloudflare Resources

#### Create D1 Database
```bash
wrangler d1 create r3l-db
```
Update `wrangler.jsonc` with the returned database ID.

#### Create R2 Bucket
```bash
wrangler r2 bucket create r3l-content
```

#### Create KV Namespaces
```bash
wrangler kv:namespace create "R3L_KV"
wrangler kv:namespace create "R3L_SESSIONS" 
wrangler kv:namespace create "R3L_USER_EMBEDDINGS"
wrangler kv:namespace create "R3L_USERS"
```
Update `wrangler.jsonc` with the returned namespace IDs.

### 4. Apply Database Schema
```bash
wrangler d1 execute r3l-db --file=./db/schema.sql
```

### 5. Set Environment Variables
```bash
# Required secrets
wrangler secret put R3L_APP_SECRET
# Enter a strong random string (32+ characters)

wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Enter your Cloudflare account ID
```

### 6. Configure Domain (Optional)
In `wrangler.jsonc`, add your custom domain:
```json
{
  "routes": [
    {
      "pattern": "r3l.yourdomain.com/*",
      "custom_domain": true
    }
  ]
}
```

## Deployment

### Development Deployment
```bash
npm run dev
```

### Production Deployment
```bash
npm run deploy
```

## Post-Deployment Verification

### 1. Health Check
Visit your deployed URL and verify:
- [ ] Homepage loads correctly
- [ ] Registration works
- [ ] Login works
- [ ] File upload works
- [ ] Navigation functions properly

### 2. Database Verification
```bash
wrangler d1 execute r3l-db --command="SELECT COUNT(*) FROM users;"
```

### 3. Security Check
- [ ] HTTPS enforced
- [ ] Secure cookies set
- [ ] CORS properly configured
- [ ] Rate limiting active

## Configuration Options

### Environment Variables (wrangler.jsonc)
```json
{
  "vars": {
    "ALLOWED_ORIGINS": "https://r3l.yourdomain.com",
    "CONTENT_EXPIRATION_DAYS": 30,
    "MAX_UPLOAD_SIZE": 10485760,
    "RATE_LIMIT_REQUESTS": 100,
    "RATE_LIMIT_WINDOW": 60,
    "WORKER_ENV": "production"
  }
}
```

### Security Headers
The application automatically sets:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Referrer-Policy`

## Monitoring & Maintenance

### 1. Monitor Logs
```bash
wrangler tail
```

### 2. Database Maintenance
```bash
# Check database size
wrangler d1 info r3l-db

# Backup database
wrangler d1 backup r3l-db
```

### 3. Content Cleanup
The system automatically expires content after 30 days. Monitor storage usage:
```bash
wrangler r2 object list r3l-content
```

### 4. Performance Monitoring
- Monitor Worker CPU time in Cloudflare dashboard
- Check D1 query performance
- Monitor R2 bandwidth usage
- Track KV read/write operations

## Scaling Considerations

### Database Scaling
- D1 supports up to 10GB per database
- Consider partitioning for larger datasets
- Monitor query performance and add indexes as needed

### Storage Scaling
- R2 has no practical size limits
- Implement content lifecycle policies
- Consider CDN for frequently accessed content

### Worker Scaling
- Workers auto-scale based on demand
- Monitor CPU time limits (10ms for free tier, 50ms for paid)
- Consider Durable Objects for stateful operations

## Backup Strategy

### 1. Database Backups
```bash
# Daily backup script
wrangler d1 backup r3l-db --output ./backups/$(date +%Y%m%d).sql
```

### 2. Content Backups
```bash
# Sync R2 content to local storage
wrangler r2 object list r3l-content --json > content-manifest.json
```

### 3. Configuration Backups
- Keep `wrangler.jsonc` in version control
- Document all secret values (encrypted)
- Maintain deployment scripts

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Verify database exists
wrangler d1 list

# Check schema
wrangler d1 execute r3l-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

#### 2. Authentication Issues
- Verify `R3L_APP_SECRET` is set
- Check cookie domain configuration
- Ensure HTTPS is enabled

#### 3. File Upload Issues
- Verify R2 bucket exists and is accessible
- Check file size limits
- Ensure presigned URL generation works

#### 4. Performance Issues
- Monitor Worker CPU usage
- Check D1 query performance
- Optimize database queries with EXPLAIN QUERY PLAN

### Debug Mode
Set `WORKER_ENV=development` for additional logging:
```json
{
  "vars": {
    "WORKER_ENV": "development"
  }
}
```

## Security Checklist

- [ ] All secrets properly configured
- [ ] HTTPS enforced
- [ ] Secure cookies enabled
- [ ] Rate limiting active
- [ ] Input validation in place
- [ ] CORS properly configured
- [ ] Content Security Policy headers set
- [ ] Regular security updates applied

## Beta Launch Readiness

The platform is ready for beta launch when:
- [ ] All health checks pass
- [ ] Security checklist completed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team trained on operations

## Support & Maintenance

### Regular Tasks
- Weekly: Review error logs and performance metrics
- Monthly: Database cleanup and optimization
- Quarterly: Security audit and dependency updates

### Emergency Procedures
1. **Service Outage**: Check Cloudflare status, review Worker logs
2. **Data Loss**: Restore from latest backup, investigate cause
3. **Security Incident**: Rotate secrets, review access logs, patch vulnerabilities

## Success Metrics

Track these metrics post-launch:
- User registration rate
- Content upload volume
- System uptime (target: 99.9%)
- Response times (target: <2s)
- Error rates (target: <1%)

The R3L:F platform is now ready for beta deployment with comprehensive monitoring, security, and maintenance procedures in place.