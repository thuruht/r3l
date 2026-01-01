# Deployment Guide

This guide details the commands required to deploy "Rel F" to production on Cloudflare Workers, including setting up secrets and configuring R2 custom domains.

## Prerequisites

*   Cloudflare Account
*   Wrangler CLI installed (`npm install -g wrangler` or use `npx wrangler`)
*   Authenticated Wrangler (`npx wrangler login`)

## 1. Environment Secrets

Before deploying, ensure your production secrets are set. These are stored securely in Cloudflare and are not in `wrangler.jsonc`.

**R2 Account ID** (Required for R2 URL generation):
```bash
npx wrangler secret put R2_ACCOUNT_ID
# Enter your Cloudflare Account ID when prompted
```

**R2 Public Domain** (Optional, if using a custom domain):
```bash
npx wrangler secret put R2_PUBLIC_DOMAIN
# Enter your domain, e.g., assets.r3l.distorted.work
```

**JWT Secret** (For secure session signing):
```bash
npx wrangler secret put JWT_SECRET
# Enter a long, random string
```

**Resend API Key** (For email verification):
```bash
npx wrangler secret put RESEND_API_KEY
# Enter your Resend API key
```

## 2. R2 Configuration

### Connect a Custom Domain (Recommended)
To serve assets from `https://assets.r3l.distorted.work`:

```bash
# Syntax: npx wrangler r2 bucket domain add <bucket-name> <domain>
npx wrangler r2 bucket domain add rr33ll-bucket assets.r3l.distorted.work
```
*Note: Cloudflare will automatically handle the DNS records and SSL certificate for this subdomain.*

### Enable `r2.dev` Public Access (Fallback)
If you are NOT using a custom domain, you must enable the managed public access:

```bash
# Syntax: npx wrangler r2 bucket dev-url enable <bucket-name>
npx wrangler r2 bucket dev-url enable rr33ll-bucket
```

## 3. Deploy Application

Deploy the Worker and the static frontend assets to Cloudflare.

```bash
npm run deploy
```
*This runs `wrangler deploy --minify`, which builds the React frontend and uploads the Worker code.*

## 4. Verification

After deployment:
1.  Visit your main domain (e.g., `https://r3l.distorted.work`).
2.  Login and upload a new Avatar.
3.  Inspect the avatar image URL to confirm it matches your configured R2 domain.
