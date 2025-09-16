#!/bin/bash

# Apply the bookmarks migration to the D1 database
echo "Applying bookmarks migration (0021)..."
npx wrangler d1 execute R3L_DB --file=./migrations/0021_bookmarks.sql

echo "Migration applied successfully!"
