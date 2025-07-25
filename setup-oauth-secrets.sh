#!/bin/bash

# Setup OAuth secrets for R3L:F (July 2025 best practices)
# This script configures all required OAuth secrets for GitHub and ORCID

echo "🔒 R3L:F OAuth Secrets Setup 🔒"
echo "==============================="
echo ""
echo "This tool will help you configure the required OAuth secrets for GitHub and ORCID authentication."
echo ""

# Verify wrangler is installed
if ! command -v npx &> /dev/null; then
  echo "❌ Error: npx is not installed. Please install Node.js and npm first."
  exit 1
fi

# Check for existing secrets
echo "📋 Checking for existing secrets..."
SECRETS=$(npx wrangler secret list 2>/dev/null)

# Function to set a secret if it doesn't exist or user wants to update it
set_secret() {
  local SECRET_NAME=$1
  local DESCRIPTION=$2
  local SHOULD_UPDATE=false
  
  if [[ $SECRETS == *"$SECRET_NAME"* ]]; then
    echo "Secret '$SECRET_NAME' already exists."
    read -p "Do you want to update it? (y/n): " UPDATE_CHOICE
    if [[ "$UPDATE_CHOICE" == "y" || "$UPDATE_CHOICE" == "Y" ]]; then
      SHOULD_UPDATE=true
    else
      echo "Skipping $SECRET_NAME..."
      return
    fi
  else
    SHOULD_UPDATE=true
  fi
  
  if [[ $SHOULD_UPDATE == true ]]; then
    echo ""
    echo "⚠️ Setting $DESCRIPTION: $SECRET_NAME"
    echo "Please enter the value (input will not be shown):"
    read -s SECRET_VALUE
    echo ""
    
    # Validate non-empty input
    if [[ -z "$SECRET_VALUE" ]]; then
      echo "❌ Error: Value cannot be empty. Skipping $SECRET_NAME..."
      return
    fi
    
    # Put the secret using wrangler
    echo "$SECRET_VALUE" | npx wrangler secret put "$SECRET_NAME"
    
    if [ $? -eq 0 ]; then
      echo "✅ Successfully set $SECRET_NAME"
    else
      echo "❌ Failed to set $SECRET_NAME"
    fi
    echo ""
  fi
}

echo ""
echo "📝 OAuth Configuration Instructions"
echo "=================================="
echo ""
echo "GitHub OAuth Setup:"
echo "1. Go to https://github.com/settings/developers"
echo "2. Create a new OAuth App or select an existing one"
echo "3. Set the callback URL to: https://r3l.distorted.work/auth/github/callback"
echo "4. Note the Client ID and generate a Client Secret"
echo ""
echo "ORCID OAuth Setup:"
echo "1. Go to https://orcid.org/developer-tools"
echo "2. Create a new OAuth App or select an existing one"
echo "3. Set the callback URL to: https://r3l.distorted.work/auth/orcid/callback"
echo "4. Note the Client ID and Client Secret"
echo ""

# Set GitHub secrets
set_secret "GITHUB_CLIENT_ID" "GitHub OAuth Client ID"
set_secret "GITHUB_CLIENT_SECRET" "GitHub OAuth Client Secret"

# Set ORCID secrets
set_secret "ORCID_CLIENT_ID" "ORCID OAuth Client ID"
set_secret "ORCID_CLIENT_SECRET" "ORCID OAuth Client Secret"

echo ""
echo "🔍 Verifying secrets configuration..."
UPDATED_SECRETS=$(npx wrangler secret list)

# Check if all required secrets are now set
if [[ $UPDATED_SECRETS == *"GITHUB_CLIENT_ID"* && 
      $UPDATED_SECRETS == *"GITHUB_CLIENT_SECRET"* && 
      $UPDATED_SECRETS == *"ORCID_CLIENT_ID"* && 
      $UPDATED_SECRETS == *"ORCID_CLIENT_SECRET"* ]]; then
  echo "✅ All required OAuth secrets are configured!"
else
  echo "⚠️ Some secrets may be missing. Please check the output above for any errors."
fi

echo ""
echo "🔒 OAuth secrets configuration completed."
echo "These secrets are stored securely in Cloudflare and will persist with your worker."
echo ""
echo "ℹ️ Callback URLs Summary:"
echo "• GitHub: https://r3l.distorted.work/auth/github/callback"
echo "• ORCID: https://r3l.distorted.work/auth/orcid/callback"
echo ""
echo "To verify the OAuth flow is working, deploy your worker and try logging in at:"
echo "https://r3l.distorted.work/login.html"
