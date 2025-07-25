# R3L:F OAuth Provider Worker

This is a dedicated Cloudflare Worker that implements the OAuth flow for the R3L:F application using the official `@cloudflare/workers-oauth-provider` package. It supports authentication with GitHub and ORCID.

## Features

- Implements OAuth 2.0 flow for GitHub and ORCID
- Uses Cloudflare KV for storing state and tokens
- Handles error cases gracefully
- Maps user profile information to a standard format
- Follows best practices for OAuth implementation on Cloudflare Workers

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up required secrets:
   ```
   ./setup-secrets.sh
   ```
   This script will guide you through setting up the following secrets:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `ORCID_CLIENT_ID`
   - `ORCID_CLIENT_SECRET`

3. Verify that the secrets are set correctly:
   ```
   npx wrangler secret list
   ```

4. Build and deploy the Worker:
   ```
   ./deploy.sh
   ```

## Integration with Main Application

After deploying the OAuth Provider Worker, you need to integrate it with the main R3L:F application:

1. Ensure the service binding is configured in the main application's `wrangler.jsonc`:
   ```json
   "services": [
     {
       "binding": "OAUTH_PROVIDER",
       "service": "workers-oauth-provider"
     }
   ]
   ```

2. Use the OAuth Provider in your main application code:
   ```typescript
   import { type OAuthProvider } from '@cloudflare/workers-oauth-provider';

   export default {
     async fetch(request: Request, env: Env): Promise<Response> {
       const router = new Router();
       
       // Use the OAuth Provider
       router.use('/auth/:provider/*', async (request, env) => {
         return env.OAUTH_PROVIDER.fetch(request);
       });

       // ...other routes
       
       return router.handle(request, env);
     }
   };
   ```

## OAuth Callback URLs

Make sure to set the following callback URLs in your OAuth application settings:

- GitHub: `https://[your-domain]/auth/github/callback`
- ORCID: `https://[your-domain]/auth/orcid/callback`

## Development

- Build: `npm run build`
- Test locally: `npx wrangler dev`
- Deploy: `npx wrangler deploy`

## Troubleshooting

- If you encounter issues with the OAuth flow, check the Worker logs: `npx wrangler tail`
- Verify that all secrets are set correctly: `npx wrangler secret list`
- Ensure the callback URLs are configured correctly in your OAuth application settings
- Check that the service binding is properly configured in the main application's `wrangler.jsonc`
