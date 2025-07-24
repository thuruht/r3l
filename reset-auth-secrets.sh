#!/bin/bash

# Reset and setup OAuth secrets for R3L auth server
# This script allows you to reset and reenter all secrets

echo "⚠️  Auth Secrets Reset and Setup Tool ⚠️"
echo "This tool will allow you to reset and reenter all OAuth secrets."
echo "Use this to ensure your secrets are correct and up-to-date."
echo ""

# Ask user if they want to reset all secrets
read -p "Do you want to reset all OAuth secrets? (y/n): " RESET_ALL

if [[ "$RESET_ALL" == "y" || "$RESET_ALL" == "Y" ]]; then
  echo "Resetting all OAuth secrets..."
  
  # Delete existing secrets
  echo "Deleting GitHub Client ID..."
  npx wrangler secret delete GITHUB_CLIENT_ID --config wrangler.auth.jsonc 2>/dev/null || echo "Secret not found, will create new."
  
  echo "Deleting GitHub Client Secret..."
  npx wrangler secret delete GITHUB_CLIENT_SECRET --config wrangler.auth.jsonc 2>/dev/null || echo "Secret not found, will create new."
  
  echo "Deleting ORCID Client ID..."
  npx wrangler secret delete ORCID_CLIENT_ID --config wrangler.auth.jsonc 2>/dev/null || echo "Secret not found, will create new."
  
  echo "Deleting ORCID Client Secret..."
  npx wrangler secret delete ORCID_CLIENT_SECRET --config wrangler.auth.jsonc 2>/dev/null || echo "Secret not found, will create new."
  
  echo "All secrets have been reset."
fi

echo ""
echo "Please enter your OAuth credentials:"
echo "You can find or create these credentials at:"
echo "GitHub: https://github.com/settings/developers"
echo "ORCID: https://orcid.org/developer-tools"
echo ""

# Set GitHub credentials
echo "Setting GitHub OAuth credentials:"
echo "Enter GitHub Client ID:"
npx wrangler secret put GITHUB_CLIENT_ID --config wrangler.auth.jsonc

echo "Enter GitHub Client Secret:"
npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.auth.jsonc

# Set ORCID credentials
echo "Setting ORCID OAuth credentials:"
echo "Enter ORCID Client ID:"
npx wrangler secret put ORCID_CLIENT_ID --config wrangler.auth.jsonc

echo "Enter ORCID Client Secret:"
npx wrangler secret put ORCID_CLIENT_SECRET --config wrangler.auth.jsonc

echo ""
echo "✅ All OAuth secrets have been updated."
echo "These secrets are stored securely in Cloudflare and will persist with your worker."
echo "You won't need to enter them again unless you need to change them."
echo ""
echo "To verify your secrets are set correctly, run:"
echo "npx wrangler secret list --config wrangler.auth.jsonc"
