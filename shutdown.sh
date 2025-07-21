#!/bin/bash
# R3L:F Project Shutdown Script
# This script backs up all data and resources, then performs a complete shutdown

# Create backup directory
BACKUP_DIR="./r3l-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

# Backup configuration files
echo "Backing up configuration files..."
cp wrangler.jsonc "$BACKUP_DIR/"
cp package.json "$BACKUP_DIR/"
cp tsconfig.json "$BACKUP_DIR/"

# Backup source code
echo "Backing up source code..."
mkdir -p "$BACKUP_DIR/src"
cp -r src/* "$BACKUP_DIR/src/"

# Backup migrations
echo "Backing up migrations..."
mkdir -p "$BACKUP_DIR/migrations"
cp -r migrations/* "$BACKUP_DIR/migrations/"

# Backup public assets
echo "Backing up public assets..."
mkdir -p "$BACKUP_DIR/public"
cp -r public/* "$BACKUP_DIR/public/"

# Backup D1 database
echo "Backing up D1 database..."
wrangler d1 backup r3l-db "$BACKUP_DIR/r3l-db-backup.sql"

# Export KV namespaces
echo "Exporting KV namespaces..."
wrangler kv:bulk export R3L_USERS "$BACKUP_DIR/r3l-users-export.json"
wrangler kv:bulk export R3L_SESSIONS "$BACKUP_DIR/r3l-sessions-export.json"
wrangler kv:bulk export R3L_USER_EMBEDDINGS "$BACKUP_DIR/r3l-user-embeddings-export.json"
wrangler kv:bulk export R3L_KV "$BACKUP_DIR/r3l-kv-export.json"
wrangler kv:bulk export OAUTH_KV "$BACKUP_DIR/oauth-kv-export.json"

# Backup R2 bucket (this downloads all objects)
echo "Backing up R2 bucket content..."
mkdir -p "$BACKUP_DIR/r2-content"
# Note: This is a simplified approach. For large buckets, you may need to implement pagination
wrangler r2 objects list r3l-content --json > "$BACKUP_DIR/r2-objects-list.json"

# Parse the JSON and download each object
echo "Downloading R2 objects..."
cat "$BACKUP_DIR/r2-objects-list.json" | jq -r '.objects[].key' | while read key; do
  echo "Downloading: $key"
  mkdir -p "$BACKUP_DIR/r2-content/$(dirname "$key")"
  wrangler r2 object get r3l-content "$key" > "$BACKUP_DIR/r2-content/$key"
done

# Get list of all secrets (can't export values, only names)
echo "Listing secrets (note: secret values cannot be exported)..."
wrangler secret list > "$BACKUP_DIR/secrets-list.txt"

# Create README for the backup
cat > "$BACKUP_DIR/BACKUP_README.md" << EOF
# R3L:F Project Backup

This backup was created on $(date) during project shutdown.

## Contents

- \`wrangler.jsonc\`: Worker configuration
- \`package.json\`: Project dependencies
- \`tsconfig.json\`: TypeScript configuration
- \`src/\`: Source code
- \`migrations/\`: Database migrations
- \`public/\`: Static assets
- \`r3l-db-backup.sql\`: D1 database backup
- \`r3l-users-export.json\`: R3L_USERS KV namespace
- \`r3l-sessions-export.json\`: R3L_SESSIONS KV namespace
- \`r3l-user-embeddings-export.json\`: R3L_USER_EMBEDDINGS KV namespace
- \`r3l-kv-export.json\`: R3L_KV KV namespace
- \`oauth-kv-export.json\`: OAUTH_KV KV namespace
- \`r2-content/\`: R2 bucket content
- \`secrets-list.txt\`: List of secret names (values not included)

## Restoration

To restore this project:

1. Create a new Worker project
2. Restore the source code and configuration
3. Create new D1/R2/KV resources with the same names
4. Import the backups using wrangler commands
5. Re-add all secrets listed in secrets-list.txt

## Note

Secret values were not backed up for security reasons. If restoring the project, you'll need to set these up again.
EOF

echo "Backup complete. All data saved to: $BACKUP_DIR"
echo ""
echo "-------------------------------------------------------------------------"
echo "IMPORTANT: This script has backed up all data. To complete the shutdown:"
echo ""
echo "1. Verify the backup is complete and intact"
echo "2. Run the following commands to delete Cloudflare resources:"
echo ""
echo "   # Disable the worker deployment"
echo "   wrangler deployment tag main --remove"
echo ""
echo "   # Delete the worker"
echo "   wrangler delete r3l"
echo ""
echo "   # Delete D1 database"
echo "   wrangler d1 delete r3l-db"
echo ""
echo "   # Delete R2 bucket"
echo "   wrangler r2 delete r3l-content"
echo ""
echo "   # Delete KV namespaces"
echo "   wrangler kv:namespace delete R3L_USERS"
echo "   wrangler kv:namespace delete R3L_SESSIONS"
echo "   wrangler kv:namespace delete R3L_USER_EMBEDDINGS"
echo "   wrangler kv:namespace delete R3L_KV"
echo "   wrangler kv:namespace delete OAUTH_KV"
echo ""
echo "3. Remove DNS records for r3l.distorted.work in Cloudflare dashboard"
echo "-------------------------------------------------------------------------"
