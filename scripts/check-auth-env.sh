#!/bin/bash

# Script to check if all required OAuth environment variables are set in Wrangler

echo "Checking OAuth environment variables..."

# Array of required secret variables
REQUIRED_VARS=(
  "GITHUB_CLIENT_ID"
  "GITHUB_CLIENT_SECRET"
  "GITHUB_REDIRECT_URI"
  "ORCID_CLIENT_ID"
  "ORCID_CLIENT_SECRET"
  "ORCID_REDIRECT_URI"
)

MISSING_VARS=()

# Check each variable using wrangler secret list
for var in "${REQUIRED_VARS[@]}"; do
  if ! wrangler secret list | grep -q "$var"; then
    MISSING_VARS+=("$var")
  fi
done

# Report results
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "✅ All required OAuth environment variables are set!"
else
  echo "❌ The following required OAuth environment variables are missing:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  
  echo ""
  echo "Please set these variables using 'wrangler secret put <VARIABLE_NAME>'"
  echo "Example:"
  echo "wrangler secret put GITHUB_CLIENT_ID"
  echo "Then enter the value when prompted"
fi

# Check GITHUB_REDIRECT_URI in wrangler.jsonc vars
if ! grep -q "GITHUB_REDIRECT_URI" wrangler.jsonc; then
  echo "⚠️  GITHUB_REDIRECT_URI is not set in wrangler.jsonc vars section."
  echo "Add it to the 'vars' section like this:"
  echo '"vars": {'
  echo '  "GITHUB_REDIRECT_URI": "https://r3l.distorted.work/auth/github/callback",'
  echo '  "ORCID_REDIRECT_URI": "https://r3l.distorted.work/auth/orcid/callback"'
  echo '}'
fi

echo ""
echo "For OAuth to work properly, you need to:"
echo "1. Register your app with GitHub and ORCID"
echo "2. Set the correct redirect URIs in their developer consoles"
echo "3. Set all the environment variables mentioned above"
echo "4. Deploy your worker with 'wrangler deploy'"
echo ""
echo "GitHub OAuth settings: https://github.com/settings/developers"
echo "ORCID OAuth settings: https://orcid.org/developer-tools"
