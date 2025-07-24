#!/bin/bash

# Complete deployment script for R3L with OpenAuth integration
echo "Starting complete R3L deployment with OpenAuth..."

# Source the credentials script to load OAuth credentials
source ./oauth-credentials.sh

# Step 1: Deploy the auth server
echo "Step 1: Deploying auth server..."
./deploy-auth.sh

if [ $? -ne 0 ]; then
  echo "Auth server deployment failed. Aborting."
  exit 1
fi

# Step 2: Set up service binding
echo "Step 2: Setting up service binding..."
./setup-service-binding.sh

if [ $? -ne 0 ]; then
  echo "Service binding setup failed. Aborting."
  exit 1
fi

# Step 3: Deploy the main application
echo "Step 3: Deploying main application..."
npx wrangler deploy

if [ $? -ne 0 ]; then
  echo "Main application deployment failed."
  exit 1
fi

echo "Deployment complete!"
echo "Main app URL: https://r3l.$(npx wrangler whoami | grep -o 'workers\.dev')"
echo "Auth server URL: https://r3l-auth.$(npx wrangler whoami | grep -o 'workers\.dev')"
