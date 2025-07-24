#!/bin/bash

# Complete OpenAuth deployment workflow
# This script handles the full deployment of the OpenAuth server
# and only prompts for secrets if they don't exist

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}R3L OpenAuth Deployment Workflow${NC}"
echo -e "This script will deploy the OpenAuth server and set up service binding"
echo -e "You will only be prompted for secrets if they haven't been set yet."
echo ""

# Function to check if secrets exist
check_secrets() {
  echo -e "${YELLOW}Checking for existing auth secrets...${NC}"
  EXISTING_SECRETS=$(npx wrangler secret list --config wrangler.auth.jsonc 2>/dev/null)
  
  # Check which secrets already exist
  GITHUB_ID_SET=false
  GITHUB_SECRET_SET=false
  ORCID_ID_SET=false
  ORCID_SECRET_SET=false
  
  if echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_ID"; then
    echo -e "${GREEN}✓${NC} GitHub Client ID is already set."
    GITHUB_ID_SET=true
  else
    echo -e "${YELLOW}!${NC} GitHub Client ID needs to be set."
  fi
  
  if echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_SECRET"; then
    echo -e "${GREEN}✓${NC} GitHub Client Secret is already set."
    GITHUB_SECRET_SET=true
  else
    echo -e "${YELLOW}!${NC} GitHub Client Secret needs to be set."
  fi
  
  if echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_ID"; then
    echo -e "${GREEN}✓${NC} ORCID Client ID is already set."
    ORCID_ID_SET=true
  else
    echo -e "${YELLOW}!${NC} ORCID Client ID needs to be set."
  fi
  
  if echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_SECRET"; then
    echo -e "${GREEN}✓${NC} ORCID Client Secret is already set."
    ORCID_SECRET_SET=true
  else
    echo -e "${YELLOW}!${NC} ORCID Client Secret needs to be set."
  fi
  
  # Return 0 if all secrets exist, 1 otherwise
  if $GITHUB_ID_SET && $GITHUB_SECRET_SET && $ORCID_ID_SET && $ORCID_SECRET_SET; then
    return 0
  else
    return 1
  fi
}

# Function to set up secrets (only called if they don't exist)
setup_secrets() {
  echo -e "${YELLOW}Setting up auth secrets (one-time setup)...${NC}"
  
  # Check for existing secrets first
  EXISTING_SECRETS=$(npx wrangler secret list --config wrangler.auth.jsonc 2>/dev/null)
  
  # Set GitHub credentials if they don't exist
  if ! echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_ID"; then
    echo -e "${YELLOW}Enter GitHub Client ID (you'll only do this once):${NC}"
    npx wrangler secret put GITHUB_CLIENT_ID --config wrangler.auth.jsonc
  fi
  
  if ! echo "$EXISTING_SECRETS" | grep -q "GITHUB_CLIENT_SECRET"; then
    echo -e "${YELLOW}Enter GitHub Client Secret (you'll only do this once):${NC}"
    npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.auth.jsonc
  fi
  
  # Set ORCID credentials if they don't exist
  if ! echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_ID"; then
    echo -e "${YELLOW}Enter ORCID Client ID (you'll only do this once):${NC}"
    npx wrangler secret put ORCID_CLIENT_ID --config wrangler.auth.jsonc
  fi
  
  if ! echo "$EXISTING_SECRETS" | grep -q "ORCID_CLIENT_SECRET"; then
    echo -e "${YELLOW}Enter ORCID Client Secret (you'll only do this once):${NC}"
    npx wrangler secret put ORCID_CLIENT_SECRET --config wrangler.auth.jsonc
  fi
  
  echo -e "${GREEN}Auth secrets are now set and will persist in your Cloudflare worker.${NC}"
  echo -e "${GREEN}You won't need to enter them again for this project.${NC}"
}

# Function to apply DB migrations
apply_migrations() {
  echo -e "${YELLOW}Applying database migrations...${NC}"
  
  # Ensure the migrations directory exists
  mkdir -p ./migrations/auth
  cp ./auth-migrations/* ./migrations/auth/
  
  # Apply migrations to remote DB
  echo -e "${YELLOW}Applying migrations to remote database...${NC}"
  npx wrangler d1 migrations apply r3l-auth-db --config wrangler.auth.jsonc
  
  echo -e "${GREEN}Database migrations applied successfully.${NC}"
}

# Function to deploy the auth server
deploy_auth_server() {
  echo -e "${YELLOW}Deploying the OpenAuth server...${NC}"
  
  npx wrangler deploy --config wrangler.auth.jsonc
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}OpenAuth server deployed successfully.${NC}"
    return 0
  else
    echo -e "${RED}Failed to deploy OpenAuth server.${NC}"
    return 1
  fi
}

# Function to set up service binding
setup_service_binding() {
  echo -e "${YELLOW}Setting up service binding between main app and auth server...${NC}"
  
  # Check if the auth server is deployed
  echo -e "${YELLOW}Checking if auth server is deployed...${NC}"
  AUTH_SERVER_NAME=$(npx wrangler whoami --config wrangler.auth.jsonc 2>/dev/null | grep -o 'r3l-auth' || echo "")
  
  if [ -z "$AUTH_SERVER_NAME" ]; then
    echo -e "${RED}Auth server not found. Please deploy it first.${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Auth server found: $AUTH_SERVER_NAME${NC}"
  
  # Add service binding to main wrangler.jsonc
  echo -e "${YELLOW}Adding service binding to main wrangler.jsonc...${NC}"
  
  # Check if service_bindings already exists in wrangler.jsonc
  if grep -q "service_bindings" wrangler.jsonc; then
    # Check if AUTH_SERVICE binding already exists
    if grep -q "AUTH_SERVICE" wrangler.jsonc; then
      echo -e "${GREEN}AUTH_SERVICE binding already exists in wrangler.jsonc${NC}"
    else
      # Update existing service_bindings
      echo -e "${YELLOW}Updating existing service_bindings...${NC}"
      sed -i '/service_bindings/,/\]/{ /\]/i \    {\n      "name": "AUTH_SERVICE",\n      "service": "r3l-auth"\n    }' wrangler.jsonc
    fi
  else
    # Add new service_bindings section
    echo -e "${YELLOW}Adding new service_bindings section...${NC}"
    cat >> wrangler.jsonc << EOF
  "service_bindings": [
    {
      "name": "AUTH_SERVICE",
      "service": "r3l-auth"
    }
  ],
EOF
  fi
  
  echo -e "${GREEN}Service binding setup complete!${NC}"
  return 0
}

# Step 4: Deploy the main application
echo "Deploying main application..."
npx wrangler deploy

echo "Deployment complete!"
echo "Visit https://[your-worker-url]/test-openauth.html to test the integration."
