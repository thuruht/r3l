#!/bin/bash

# One-time secure setup script for R3L auth server
# This script sets up the auth server secrets only if they don't already exist

echo "Checking for existing auth secrets..."

# Check if secrets already exist
EXISTING_SECRETS=$(npx wrangler secret list --config wrangler.auth.jsonc)

# Initialize status variables
GITHUB_ID_SET=false
GITHUB_SECRET_SET=false
ORCID_ID_SET=false
ORCID_SECRET_SET=false

# Check which secrets already exist
if echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_ID"; then
  echo "✅ GitHub Client ID is already set."
  GITHUB_ID_SET=true
fi

if echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_SECRET"; then
  echo "✅ GitHub Client Secret is already set."
  GITHUB_SECRET_SET=true
fi

if echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_ID"; then
  echo "✅ ORCID Client ID is already set."
  ORCID_ID_SET=true
fi

if echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_SECRET"; then
  echo "✅ ORCID Client Secret is already set."
  ORCID_SECRET_SET=true
fi

# Check if all secrets are already set
if $GITHUB_ID_SET && $GITHUB_SECRET_SET && $ORCID_ID_SET && $ORCID_SECRET_SET; then
  echo "All auth secrets are already set. No action needed."
  exit 0
fi

echo "Some secrets need to be set. You'll only need to do this once."

# Interactive setup for GitHub secrets
if ! $GITHUB_ID_SET; then
  echo "Setting GitHub Client ID (you'll only do this once)..."
  echo "Enter your GitHub Client ID:"
  npx wrangler secret put GITHUB_CLIENT_ID --config wrangler.auth.jsonc
fi

if ! $GITHUB_SECRET_SET; then
  echo "Setting GitHub Client Secret (you'll only do this once)..."
  echo "Enter your GitHub Client Secret:"
  npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.auth.jsonc
fi

# Interactive setup for ORCID secrets
if ! $ORCID_ID_SET; then
  echo "Setting ORCID Client ID (you'll only do this once)..."
  echo "Enter your ORCID Client ID:"
  npx wrangler secret put ORCID_CLIENT_ID --config wrangler.auth.jsonc
fi

if ! $ORCID_SECRET_SET; then
  echo "Setting ORCID Client Secret (you'll only do this once)..."
  echo "Enter your ORCID Client Secret:"
  npx wrangler secret put ORCID_CLIENT_SECRET --config wrangler.auth.jsonc
fi

echo "Auth secrets are now set and will persist in your Cloudflare worker."
echo "You won't need to enter them again for this project."
