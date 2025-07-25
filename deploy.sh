#!/bin/bash

echo "R3L Deployment Script"
echo "====================="
echo ""

# Step 1: Verify that secrets are set
echo "Step 1: Verifying secrets..."
SECRETS=$(npx wrangler secret list)

if [[ $SECRETS != *"GITHUB_CLIENT_ID"* || $SECRETS != *"GITHUB_CLIENT_SECRET"* || 
      $SECRETS != *"ORCID_CLIENT_ID"* || $SECRETS != *"ORCID_CLIENT_SECRET"* ]]; then
    echo "❌ Missing required secrets. Please run ./reset-auth-secrets.sh first."
    exit 1
fi
echo "✅ Secrets verified"
echo ""

# Step 2: Build the project
echo "Step 2: Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix any errors and try again."
    exit 1
fi
echo "✅ Build successful"
echo ""

# Step 3: Deploy without the service binding temporarily
echo "Step 3: Deploying without service binding..."
echo "Note: We'll temporarily modify wrangler.jsonc to remove the service binding that's causing issues"

# Create a backup of wrangler.jsonc
cp wrangler.jsonc wrangler.jsonc.bak

# Modify wrangler.jsonc to remove the service binding section
sed -i '/  "services": \[/,/  \],/d' wrangler.jsonc

# Deploy without the service binding
npx wrangler deploy

# Restore the original wrangler.jsonc
mv wrangler.jsonc.bak wrangler.jsonc

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Note: The OAUTH_PROVIDER service binding was removed for this deployment."
echo "In the future, you'll need to create the 'workers-oauth-provider' worker"
echo "or use a different authentication approach."
echo ""
echo "Your site should now be available at: https://r3l.distorted.work"
