#!/bin/bash

# Apply the reactions migration to the D1 database
echo "Applying reactions migration (0022)..."
npx wrangler d1 execute R3L_DB --file=./migrations/0022_reactions.sql

echo "Migration applied successfully!"
