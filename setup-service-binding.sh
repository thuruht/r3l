#!/bin/bash

# Script to set up the service binding between the main app and the auth server
echo "Setting up service binding between main app and auth server..."

# Check if the auth server is deployed
echo "Checking if auth server is deployed..."
AUTH_SERVER_INFO=$(npx wrangler whoami 2>/dev/null)
AUTH_SERVER_WORKER=$(npx wrangler list | grep -o "r3l-auth" || echo "")

if [ -z "$AUTH_SERVER_WORKER" ]; then
  echo "Auth server not found. Please deploy it first with:"
  echo "./deploy-auth.sh"
  
  read -p "Would you like to deploy the auth server now? (y/n): " DEPLOY_NOW
  if [[ "$DEPLOY_NOW" =~ ^[Yy]$ ]]; then
    ./deploy-auth.sh
  else
    exit 1
  fi
fi

echo "Auth server found: $AUTH_SERVER_WORKER"

# Add service binding to main wrangler.jsonc
echo "Adding service binding to main wrangler.jsonc..."

# Check if service_bindings already exists in wrangler.jsonc
if grep -q "service_bindings" wrangler.jsonc; then
  # Update existing service_bindings
  echo "Updating existing service_bindings..."
  sed -i '/service_bindings/,/\]/{ /\]/i \    {\n      "name": "AUTH_SERVICE",\n      "service": "r3l-auth"\n    }' wrangler.jsonc
else
  # Add new service_bindings section
  echo "Adding new service_bindings section..."
  cat >> wrangler.jsonc << EOF
  "service_bindings": [
    {
      "name": "AUTH_SERVICE",
      "service": "r3l-auth"
    }
  ],
EOF
fi

echo "Service binding setup complete!"
echo "Now update your code to use the AUTH_SERVICE binding to make requests to the auth server."
