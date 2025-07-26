# R3L:F - Research Ecosystem for Living Futures

R3L:F is an anti-algorithmic, ephemeral, user-controlled, privacy-first file-sharing platform.

## Core Philosophy

- **Anti-algorithmic**: Content discovery is based on direct connections and explicit user actions
- **Ephemeral by default**: Content expires after 7 days unless explicitly preserved by uploader (user), or by voting - see Community-driven archiving.
- **User-controlled**: Users have full control over their content and connections
- **Privacy-focused**: Uses privacy-respecting technologies throughout the stack
- **Community-driven archiving**: Important content can be preserved through explicit voting

## Technology Stack

- **Backend**: Cloudflare Workers, D1, R2, KV, Durable Objects, OpenAuth
- **Frontend**: HTML, CSS, JavaScript with consolidated global styling
- **Fonts**: Bunny Fonts (privacy-respecting alternative to Google Fonts)
- **Visualization**: D3.js for Association Web
- **Authentication**: GitHub and ORCID OAuth via OpenAuth

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
4. Set up required secrets (DO NOT add these to your code or wrangler.jsonc):
   ```
   wrangler secret put R3L_APP_SECRET
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put ORCID_CLIENT_ID
   wrangler secret put ORCID_CLIENT_SECRET
   wrangler secret put R3L_ADMIN_ORCID_ID
   wrangler secret put CLOUDFLARE_ACCOUNT_ID
   ```
5. Deploy with OpenAuth integration:
   ```
   ./deploy-openauth.sh
   ```
   
   Or deploy manually with these steps:
   
   a. Deploy the database migrations:
   ```
   # Apply migrations to the main database
   ./migrations/apply-migrations.sh
   
   # Apply migrations to the auth database
   ./setup-auth.sh
   ```
   
   b. Deploy the auth server:
   ```
   npx wrangler deploy --config wrangler.auth.jsonc
   ```
   
   c. Set up service binding:
   ```
   ./setup-service-binding.sh
   ```
   
   d. Deploy the main application:
   ```
   npm run build
   npm run deploy
   ```
