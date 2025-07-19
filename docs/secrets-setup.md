# Setting Up Secrets for R3L:F

This document explains how to properly set up secrets for the R3L:F project using Cloudflare Wrangler.

## Why Secrets Matter

Secrets like API keys, client secrets, and other sensitive information should never be committed to version control or hardcoded in your application. Instead, they should be stored securely as environment secrets.

## Required Secrets

The R3L:F project requires the following secrets to be set up:

1. **R3L_APP_SECRET** - A random string used for signing cookies and tokens
2. **ORCID_CLIENT_ID** - Your ORCID API client ID
3. **ORCID_CLIENT_SECRET** - Your ORCID API client secret
4. **R3L_ADMIN_ORCID_ID** - The ORCID ID of the admin user
5. **CLOUDFLARE_ACCOUNT_ID** - Your Cloudflare account ID
6. **REALTIME_API_TOKEN** - Your Cloudflare Realtime API token

## Setting Up Secrets

Use the Wrangler CLI to set up each secret:

```bash
# Generate a random app secret
APP_SECRET=$(openssl rand -hex 32)
wrangler secret put R3L_APP_SECRET --value "$APP_SECRET"

# Set ORCID credentials (obtained from ORCID Developer Portal)
wrangler secret put ORCID_CLIENT_ID
# You will be prompted to enter the value

wrangler secret put ORCID_CLIENT_SECRET
# You will be prompted to enter the value

# Set admin ORCID ID
wrangler secret put R3L_ADMIN_ORCID_ID
# You will be prompted to enter the value

# Set Cloudflare account ID (found in Cloudflare dashboard)
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# You will be prompted to enter the value

# Set Realtime API token (generated in Cloudflare dashboard)
wrangler secret put REALTIME_API_TOKEN
# You will be prompted to enter the value
```

## Verifying Secrets

You can verify that your secrets are properly set up with:

```bash
wrangler secret list
```

This will show a list of the secrets that have been set up for your application, but not their values.

## Local Development

For local development, you can create a `.dev.vars` file in your project root with the same environment variables:

```
R3L_APP_SECRET=your_local_app_secret
ORCID_CLIENT_ID=your_orcid_client_id
ORCID_CLIENT_SECRET=your_orcid_client_secret
R3L_ADMIN_ORCID_ID=your_admin_orcid_id
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
REALTIME_API_TOKEN=your_realtime_api_token
```

Make sure to add `.dev.vars` to your `.gitignore` file to prevent accidentally committing it to version control.

## Rotating Secrets

It's good practice to rotate your secrets periodically. To rotate a secret, simply run the `wrangler secret put` command again with the new value.
