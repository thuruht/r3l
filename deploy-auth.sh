#!/bin/bash

# Deploy script for the R3L auth server
echo "Deploying R3L OpenAuth server..."

# Source the credentials script to load OAuth credentials
source ./oauth-credentials.sh

# First check if the D1 database exists
echo "Checking if D1 database exists..."
DB_EXISTS=$(npx wrangler d1 list | grep -c "r3l-auth-db")

if [ "$DB_EXISTS" -eq 0 ]; then
  echo "Creating D1 database r3l-auth-db..."
  npx wrangler d1 create r3l-auth-db
  
  # Update wrangler.auth.jsonc with new database ID
  DB_ID=$(npx wrangler d1 list --json | jq -r '.[] | select(.name=="r3l-auth-db") | .uuid')
  if [ -n "$DB_ID" ]; then
    echo "Updating wrangler.auth.jsonc with database ID: $DB_ID"
    sed -i "s/\"database_id\": \"[^\"]*\"/\"database_id\": \"$DB_ID\"/" wrangler.auth.jsonc
  else
    echo "Failed to get database ID"
    exit 1
  fi
fi

# Check if KV namespace exists
echo "Checking if KV namespace exists..."
KV_EXISTS=$(npx wrangler kv namespace list | grep -c "AUTH_STORAGE")

if [ "$KV_EXISTS" -eq 0 ]; then
  echo "Creating KV namespace AUTH_STORAGE..."
  npx wrangler kv namespace create AUTH_STORAGE
  
  # Update wrangler.auth.jsonc with new KV namespace ID
  KV_ID=$(npx wrangler kv namespace list --json | jq -r '.[] | select(.title=="r3l-AUTH_STORAGE") | .id')
  if [ -n "$KV_ID" ]; then
    echo "Updating wrangler.auth.jsonc with KV namespace ID: $KV_ID"
    sed -i "s/\"id\": \"[^\"]*\"/\"id\": \"$KV_ID\"/" wrangler.auth.jsonc
  else
    echo "Failed to get KV namespace ID"
    exit 1
  fi
fi

# Run the setup script to ensure secrets and migrations are applied
echo "Running setup script..."
./setup-auth.sh

# Deploy the auth server
echo "Deploying auth server..."
npx wrangler deploy --config wrangler.auth.jsonc

echo "Auth server deployed successfully!"
echo "URL: https://r3l-auth.$(npx wrangler whoami | grep -o 'workers\.dev')"
