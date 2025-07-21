#!/bin/bash

# Check if migrations have been applied and apply them if needed
# Usage: ./check-and-apply-migrations.sh [--local|--remote] [database_name]

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
  echo "Usage: ./check-and-apply-migrations.sh [--local|--remote] [database_name]"
  exit 1
fi

echo "Checking for unapplied migrations on $DATABASE_NAME database ($MODE)"

# Check for unapplied migrations
UNAPPLIED=$(npx wrangler d1 migrations list "$DATABASE_NAME" "$MODE")

if [[ $UNAPPLIED == *"No unapplied migrations"* ]]; then
  echo "✅ All migrations have been applied to $DATABASE_NAME!"
  exit 0
else
  echo "Found unapplied migrations. Applying them now..."
  
  # Apply migrations
  npx wrangler d1 migrations apply "$DATABASE_NAME" "$MODE"
  
  if [ $? -eq 0 ]; then
    echo "✅ Migrations applied successfully to $DATABASE_NAME!"
    echo "The R3L:F application should now function properly."
  else
    echo "❌ Error applying migrations to $DATABASE_NAME."
    echo "Please check your wrangler.jsonc configuration and ensure D1 is set up correctly."
    exit 1
  fi
fi
