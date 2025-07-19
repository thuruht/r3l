# R3L:F - Research Ecosystem for Living Futures

R3L:F is an anti-algorithmic, ephemeral, user-controlled, privacy-first file-sharing platform.

## Core Philosophy

- **Anti-algorithmic**: Content discovery is based on direct connections and explicit user actions
- **Ephemeral by default**: Content expires after 7 days unless explicitly preserved
- **User-controlled**: Users have full control over their content and connections
- **Privacy-focused**: Uses privacy-respecting technologies throughout the stack
- **Community-driven archiving**: Important content can be preserved through explicit voting

## Technology Stack

- **Backend**: Cloudflare Workers, D1, R2, KV, Durable Objects, RealtimeKit
- **Frontend**: HTML, CSS, JavaScript with consolidated global styling
- **Fonts**: Bunny Fonts (privacy-respecting alternative to Google Fonts)
- **Visualization**: D3.js for Association Web

## Deployment

This project is designed to be deployed to Cloudflare Workers. All file paths are relative to support deployment to r3l.distorted.work.

### Prerequisites

1. Node.js 18+
2. Cloudflare account with Workers, D1, R2, KV, and Durable Objects
3. Wrangler CLI installed globally

### Deployment Steps

1. Clone this repository
2. Install dependencies: `npm install`
3. Configure your Cloudflare account in wrangler.jsonc
4. Set up required secrets:
   ```
   wrangler secret put R3L_APP_SECRET
   wrangler secret put ORCID_CLIENT_SECRET
   wrangler secret put CLOUDFLARE_ACCOUNT_ID
   wrangler secret put REALTIME_API_TOKEN
   ```
5. Deploy the database migrations using Wrangler:
   ```
   wrangler d1 execute r3l-db --file=migrations/001_ephemeral_content.sql
   wrangler d1 execute r3l-db --file=migrations/002_content_associations.sql
   wrangler d1 execute r3l-db --file=migrations/003_drawers.sql
   wrangler d1 execute r3l-db --file=migrations/004_content.sql
   wrangler d1 execute r3l-db --file=migrations/005_users.sql
   wrangler d1 execute r3l-db --file=migrations/006_auth_sessions.sql
   wrangler d1 execute r3l-db --file=migrations/007_content_sharing.sql
   wrangler d1 execute r3l-db --file=migrations/008_archive_voting.sql
   wrangler d1 execute r3l-db --file=migrations/009_tag_management.sql
   ```
6. Build and deploy the worker:
   ```
   npm run build
   npm run deploy
   ```

## Development

For local development:

```
npm run dev
```

## License

MIT
