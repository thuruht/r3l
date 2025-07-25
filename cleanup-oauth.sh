#!/bin/bash
# cleanup-oauth.sh
# Script to remove all OAuth-related code and files

echo "🧹 Cleaning up OAuth-related code and files..."

# 1. Remove OAuth handler imports and usage
echo "Removing OAuth handler references..."
if [ -f src/worker.ts ]; then
  sed -i '/AuthHandler/d' src/worker.ts
fi

# 2. Remove OAuth callback files and directories
echo "Removing OAuth callback directories..."
rm -rf public/auth/github
rm -rf public/auth/orcid
rm -f public/auth/callback.html
rm -f public/auth/test-github-flow.html
rm -f public/auth/test-cookies.html

# 3. Remove GitHub/ORCID OAuth environment variables from wrangler.toml
echo "Updating environment variables in wrangler.jsonc..."
if [ -f wrangler.jsonc ]; then
  # Remove GitHub OAuth variables
  sed -i '/GITHUB_CLIENT_ID/d' wrangler.jsonc
  sed -i '/GITHUB_CLIENT_SECRET/d' wrangler.jsonc
  sed -i '/GITHUB_REDIRECT_URI/d' wrangler.jsonc
  
  # Remove ORCID OAuth variables
  sed -i '/ORCID_CLIENT_ID/d' wrangler.jsonc
  sed -i '/ORCID_CLIENT_SECRET/d' wrangler.jsonc
  sed -i '/ORCID_REDIRECT_URI/d' wrangler.jsonc
fi

# 4. Check if there are any remaining OAuth references
echo "Checking for remaining OAuth references..."
grep -r "github\.com/login/oauth" --include="*.ts" --include="*.js" src/
grep -r "orcid\.org/oauth" --include="*.ts" --include="*.js" src/

echo "✅ OAuth cleanup completed"
