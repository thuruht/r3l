#!/bin/bash

# Script to apply the JWT auth migration

# Set the wrangler path
WRANGLER="npx wrangler"

# Check if D1 binding name is available
if [ -z "$D1_BINDING" ]; then
  D1_BINDING="R3L_DB"
fi

echo "🔑 Applying JWT auth migration..."
echo "Using D1 binding: $D1_BINDING"

# Apply the migration
$WRANGLER d1 execute $D1_BINDING --file="./migrations/010_jwt_auth.sql"

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "✅ JWT auth migration applied successfully!"
else
  echo "❌ Failed to apply JWT auth migration"
  exit 1
fi

echo "📊 Verifying migration..."

# Run a query to check if the tables were created
$WRANGLER d1 execute $D1_BINDING --command="SELECT name FROM sqlite_master WHERE type='table' AND (name='user_credentials' OR name='auth_log')"

echo "🔐 JWT authentication system is ready to use"
echo "You can now register users at /auth/register.html and login at /auth/login.html"
