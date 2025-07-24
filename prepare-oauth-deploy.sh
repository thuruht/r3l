#!/bin/bash
# Final OAuth deployment fixes

# Check for ORCID and GitHub client secrets in environment
if [ -z "$ORCID_CLIENT_SECRET" ] || [ -z "$GITHUB_CLIENT_SECRET" ]; then
    echo "Warning: OAuth client secrets not found in environment"
    echo "Please set ORCID_CLIENT_SECRET and GITHUB_CLIENT_SECRET before deploying"
fi

# Create local wrangler.toml with secrets (ignored by git)
cat > wrangler.toml << EOF
name = "r3l"
main = "src/worker.ts"
compatibility_date = "2023-09-04"
compatibility_flags = ["nodejs_compat"]

[vars]
ORCID_CLIENT_ID = "APP-ZNGD0RVXYZ4XO79N"
GITHUB_CLIENT_ID = "your-github-client-id"
ORCID_REDIRECT_URI = "https://r3l.distorted.work/auth/orcid/callback"
GITHUB_REDIRECT_URI = "https://r3l.distorted.work/auth/github/callback"

[[kv_namespaces]]
binding = "OAUTH_KV"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "R3L_DB"
database_name = "r3l"
database_id = "your-d1-database-id"
EOF

echo "Created local wrangler.toml template - please update with your real values"

# Check if migrations exist and migrations directory is present
if [ -d "migrations" ]; then
    echo "Found migrations directory"
    
    # Check if we need to apply migrations
    echo "You should run migrations before deploying:"
    echo "wrangler d1 migrations apply r3l --local"
    echo "wrangler d1 migrations apply r3l"
else
    echo "ERROR: migrations directory not found"
    exit 1
fi

# Double check that fix-all-cookies.sh has been run
if ! grep -q "Request domain:" src/router.ts; then
    echo "WARNING: Cookie fixes don't appear to be applied"
    echo "Please run ./fix-all-cookies.sh first"
fi

echo "Pre-deployment checklist:"
echo "1. Update wrangler.toml with your values"
echo "2. Run migrations locally and to production"
echo "3. Ensure client secrets are set:"
echo "   wrangler secret put ORCID_CLIENT_SECRET"
echo "   wrangler secret put GITHUB_CLIENT_SECRET"
echo ""
echo "To deploy:"
echo "npm run build && wrangler deploy"
