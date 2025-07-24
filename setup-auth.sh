#!/bin/bash

# Setup script for R3L auth server
echo "Setting up R3L OpenAuth server..."

# Source the credentials script to load or prompt for OAuth credentials
source ./oauth-credentials.sh

# Apply database migrations
echo "Applying database migrations..."
# First, ensure the migrations directory is found by D1
mkdir -p ./migrations/auth
cp ./auth-migrations/* ./migrations/auth/

# Apply migrations locally for testing
npx wrangler d1 migrations apply r3l-auth-db --local ./migrations/auth

# Apply migrations to remote DB
npx wrangler d1 migrations apply r3l-auth-db --config wrangler.auth.jsonc

# OAuth credentials are now loaded from the oauth-credentials.sh script
echo "Using GitHub and ORCID OAuth credentials from environment..."

# Set wrangler secrets
echo "Setting up wrangler secrets..."
npx wrangler secret put GITHUB_CLIENT_ID --config wrangler.auth.jsonc <<< "${GITHUB_CLIENT_ID}"
npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.auth.jsonc <<< "${GITHUB_CLIENT_SECRET}"
npx wrangler secret put ORCID_CLIENT_ID --config wrangler.auth.jsonc <<< "${ORCID_CLIENT_ID}"
npx wrangler secret put ORCID_CLIENT_SECRET --config wrangler.auth.jsonc <<< "${ORCID_CLIENT_SECRET}"

echo "Auth server setup complete!"
