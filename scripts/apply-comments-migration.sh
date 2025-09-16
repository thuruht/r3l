#!/bin/bash

# Apply the comments migration to the D1 database
echo "Applying comments migration (0020)..."
npx wrangler d1 execute R3L_DB --file=./migrations/0020_comments.sql

echo "Migration applied successfully!"
