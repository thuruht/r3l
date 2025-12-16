# R2 & Custom Domain Configuration

To securely serve user avatars and public files from Cloudflare R2, and to use a custom domain for these assets, follow these steps.

## 1. Cloudflare Dashboard Setup

1.  **Create a Bucket**: Ensure you have an R2 bucket created (e.g., `rr33ll-bucket`).
2.  **Enable Public Access** (Required for the `r2.dev` fallback):
    *   Go to your R2 bucket settings.
    *   Enable "Public Access" to get a subdomain like `pub-<bucket-name>.<account-id>.r2.dev`.
3.  **Connect a Custom Domain** (Recommended for production):
    *   In R2 Bucket Settings > "Custom Domains", connect a domain (e.g., `assets.r3l.distorted.work`).
    *   Cloudflare will handle the DNS and SSL certificate automatically.

## 2. Worker Environment Configuration

You need to provide the Worker with your Account ID and (optionally) your Custom Domain.

### `wrangler.jsonc` (Local Development & Deployment)

Update your `wrangler.jsonc` file to include these variables. **Do not commit secrets.**

```jsonc
{
  // ... other config ...
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "rr33ll-bucket"
    }
  ],
  "vars": {
    "R2_ACCOUNT_ID": "your_actual_account_id_here",
    "R2_PUBLIC_DOMAIN": "assets.r3l.distorted.work" // Optional: Remove if using r2.dev
  }
}
```

### Secrets (Production)

For sensitive data or production-specific config, use `wrangler secret put`:

```bash
npx wrangler secret put R2_ACCOUNT_ID
# Enter your account ID

# If using a custom domain (not strictly a secret, but can be managed here or in vars)
npx wrangler secret put R2_PUBLIC_DOMAIN
# Enter e.g., assets.r3l.distorted.work
```

## 3. Verification

Once deployed, the application uses `getR2PublicUrl` in `src/index.ts` to generate URLs:

*   **If `R2_PUBLIC_DOMAIN` is set**: `https://assets.r3l.distorted.work/avatars/user-123/avatar.jpg`
*   **If NOT set**: `https://pub-rr33ll-bucket.829921....r2.dev/avatars/user-123/avatar.jpg`

Ensure that your CORS policy on the bucket (if any) allows requests from your main application domain.
