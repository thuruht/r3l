#!/bin/bash

# Create a temporary directory for the reordered migrations
mkdir -p migrations_reordered

# Copy migrations in the correct order
echo "Reordering migrations to fix dependencies..."

# First, content and user tables (dependencies for other tables)
cp migrations/004_content.sql migrations_reordered/001_content.sql
cp migrations/005_users.sql migrations_reordered/002_users.sql

# Authentication and sessions
cp migrations/006_auth_sessions.sql migrations_reordered/003_auth_sessions.sql

# Content-related tables
cp migrations/002_content_associations.sql migrations_reordered/004_content_associations.sql
cp migrations/003_drawers.sql migrations_reordered/005_drawers.sql
cp migrations/007_content_sharing.sql migrations_reordered/006_content_sharing.sql

# Content lifecycle features (previously attempted in 001)
cp migrations/001_ephemeral_content.sql migrations_reordered/007_ephemeral_content.sql

# Archive and tag management
cp migrations/008_archive_voting.sql migrations_reordered/008_archive_voting.sql
cp migrations/009_tag_management.sql migrations_reordered/009_tag_management.sql

echo "Migrations reordered. The new order is:"
ls -la migrations_reordered/

echo ""
echo "To use these reordered migrations:"
echo "1. Backup your current migrations: mv migrations migrations_original"
echo "2. Move the reordered migrations: mv migrations_reordered migrations"
echo "3. Apply the migrations: ./migrations/apply-migrations.sh --local r3l-db"
echo ""
echo "WARNING: This is a local operation only. To apply these changes to production,"
echo "you should carefully review the migrations first and then run with --remote."
