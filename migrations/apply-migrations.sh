#!/bin/bash

# Apply migrations to D1 database
# Usage: ./apply-migrations.sh [--local|--remote] [database_name]

# Default values
MODE="--remote"
DATABASE_NAME=$(grep -o '"database_name": "[^"]*"' wrangler.jsonc | head -1 | cut -d'"' -f4)

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      MODE="--local"
      shift
      ;;
    --remote)
      MODE="--remote"
      shift
      ;;
    *)
      DATABASE_NAME="$1"
      shift
      ;;
  esac
done

# Check if database name is found
if [ -z "$DATABASE_NAME" ]; then
  echo "Error: Could not determine database name. Please specify it as an argument."
  echo "Usage: ./apply-migrations.sh [--local|--remote] [database_name]"
  exit 1
fi

echo "Applying migrations to $DATABASE_NAME database ($MODE)"
echo "This will create all necessary tables for R3L:F to function properly."
echo "Migrations will be applied from the /migrations directory."

# Apply migrations
npx wrangler d1 migrations apply "$DATABASE_NAME" "$MODE"

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully to $DATABASE_NAME!"
  echo "The R3L:F application should now function properly."
else
  echo "❌ Error applying migrations to $DATABASE_NAME."
  echo "Please check your wrangler.jsonc configuration and ensure D1 is set up correctly."
fi
