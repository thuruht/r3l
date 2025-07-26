#!/bin/bash

# Apply the geo_points migration to the D1 database
echo "Applying geo_points migration (014)..."
npx wrangler d1 execute R3L_DB --file=./migrations/014_geo_points_table.sql

echo "Migration applied successfully!"
