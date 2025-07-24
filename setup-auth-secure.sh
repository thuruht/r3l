#!/bin/bash

# Secure setup script for R3L auth server
# This script sets up the auth server without storing credentials in files

echo "Setting up R3L OpenAuth server securely..."

# Apply database migrations
echo "Applying database migrations..."
mkdir -p ./migrations/auth
cp ./auth-migrations/* ./migrations/auth/

# Apply migrations to remote DB
npx wrangler d1 migrations apply r3l-auth-db --config wrangler.auth.jsonc

# Check if secrets already exist
echo "Checking for existing secrets..."
EXISTING_SECRETS=$(npx wrangler secret list --config wrangler.auth.jsonc)

# Interactive setup for GitHub secrets
if echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_ID"; then
  echo "GitHub Client ID is already set."
else
  echo "Setting up GitHub Client ID..."
  echo "Enter your GitHub Client ID:"
  npx wrangler secret put GITHUB_CLIENT_ID --config wrangler.auth.jsonc
fi

if echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_SECRET"; then
  echo "GitHub Client Secret is already set."
else
  echo "Setting up GitHub Client Secret..."
  echo "Enter your GitHub Client Secret:"
  npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.auth.jsonc
fi

# Interactive setup for ORCID secrets
if echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_ID"; then
  echo "ORCID Client ID is already set."
else
  echo "Setting up ORCID Client ID..."
  echo "Enter your ORCID Client ID:"
  npx wrangler secret put ORCID_CLIENT_ID --config wrangler.auth.jsonc
fi

if echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_SECRET"; then
  echo "ORCID Client Secret is already set."
else
  echo "Setting up ORCID Client Secret..."
  echo "Enter your ORCID Client Secret:"
  npx wrangler secret put ORCID_CLIENT_SECRET --config wrangler.auth.jsonc
fi

echo "Auth server setup complete!"
echo "You can now deploy the auth server with: npx wrangler deploy --config wrangler.auth.jsonc"
