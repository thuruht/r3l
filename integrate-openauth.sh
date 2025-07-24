#!/bin/bash

# Script to integrate OpenAuth with the R3L application
echo "Integrating OpenAuth with R3L..."

# Check if auth-openauth.ts exists
if [ ! -f "./src/handlers/auth-openauth.ts" ]; then
  echo "Error: auth-openauth.ts not found. Please create it first."
  exit 1
fi

# Check if auth-service-adapter.ts exists
if [ ! -f "./src/auth-service-adapter.ts" ]; then
  echo "Error: auth-service-adapter.ts not found. Please create it first."
  exit 1
fi

# Create backup of the current auth handler
echo "Creating backup of current auth handler..."
cp ./src/handlers/auth.ts ./src/handlers/auth.bak.ts

# Replace auth handler with OpenAuth implementation
echo "Replacing auth handler with OpenAuth implementation..."
cp ./src/handlers/auth-openauth.ts ./src/handlers/auth.ts

# Check if service binding is configured
if ! grep -q "AUTH_SERVICE" wrangler.jsonc; then
  echo "Warning: AUTH_SERVICE binding not found in wrangler.jsonc"
  echo "Run './setup-service-binding.sh' to configure the service binding."
fi

echo "Integration complete!"
echo ""
echo "Next steps:"
echo "1. Run './deploy-openauth.sh' to deploy the auth server"
echo "2. Run './setup-service-binding.sh' to configure the service binding"
echo "3. Deploy the main application: npx wrangler deploy"
