#!/bin/bash

# Script to update the database schema for r3l-db

echo "Updating database schema in remote database"
echo "This will adapt the existing tables to the new schema."

# Check if we need to create a backup table
echo "Creating backup of the content table..."
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_backup AS SELECT * FROM content;
"

# Check for missing columns in users table
echo "Checking users table for missing columns..."

# Check if updated_at column exists in users table
UPDATED_AT_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(users)" | grep -c "updated_at")
if [ "$UPDATED_AT_COL_EXISTS" -eq "0" ]; then
  echo "Adding updated_at column to users table..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());"
fi

# Check for missing columns in auth_sessions table
echo "Checking auth_sessions table for missing columns..."

# Check if token column exists in auth_sessions table
TOKEN_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(auth_sessions)" | grep -c "token")
if [ "$TOKEN_COL_EXISTS" -eq "0" ]; then
  echo "Adding token column to auth_sessions table..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE auth_sessions ADD COLUMN token TEXT NOT NULL DEFAULT '';"
  
  # Create index for token column
  echo "Creating index for token column..."
  npx wrangler d1 execute r3l-db --remote --command "CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);"
fi

# Add missing columns to the content table
echo "Adding missing columns to content table..."

# Check if type column exists, if not add it
TYPE_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "type")
if [ "$TYPE_COL_EXISTS" -eq "0" ]; then
  echo "Adding type column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN type TEXT NOT NULL DEFAULT 'text';"
fi

# Check if category column exists, if not add it
CATEGORY_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "category")
if [ "$CATEGORY_COL_EXISTS" -eq "0" ]; then
  echo "Adding category column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN category TEXT NOT NULL DEFAULT 'general';"
fi

# Check if description column exists, if not add it
DESCRIPTION_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "description")
if [ "$DESCRIPTION_COL_EXISTS" -eq "0" ]; then
  echo "Adding description column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN description TEXT;"
fi

# Check if user_id column exists, if not add it and migrate data
USER_ID_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "user_id")
if [ "$USER_ID_COL_EXISTS" -eq "0" ]; then
  echo "Adding user_id column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN user_id TEXT;"
  
  # Update existing rows to get user_id from creator_orcid
  echo "Updating user_id from creator_orcid..."
  npx wrangler d1 execute r3l-db --remote --command "
  UPDATE content SET user_id = (
    SELECT id FROM users WHERE orcid_id = content.creator_orcid LIMIT 1
  ) WHERE creator_orcid IS NOT NULL;
  "
fi

# Check if tags column exists, if not add it
TAGS_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "tags")
if [ "$TAGS_COL_EXISTS" -eq "0" ]; then
  echo "Adding tags column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN tags TEXT;"
fi

# Check if file_key column exists, if not add it
FILE_KEY_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "file_key")
if [ "$FILE_KEY_COL_EXISTS" -eq "0" ]; then
  echo "Adding file_key column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN file_key TEXT;"
fi

# Check if is_public column exists, if not add it and migrate data
IS_PUBLIC_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "is_public")
if [ "$IS_PUBLIC_COL_EXISTS" -eq "0" ]; then
  echo "Adding is_public column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;"
  
  # Update existing rows based on visibility
  echo "Updating is_public from visibility..."
  npx wrangler d1 execute r3l-db --remote --command "
  UPDATE content SET is_public = CASE WHEN visibility = 'public' THEN 1 ELSE 0 END;
  "
fi

# Check if updated_at column exists, if not add it
UPDATED_AT_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "updated_at")
if [ "$UPDATED_AT_COL_EXISTS" -eq "0" ]; then
  echo "Adding updated_at column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());"
  
  # Update existing rows to set updated_at = created_at
  echo "Setting updated_at = created_at for existing rows..."
  npx wrangler d1 execute r3l-db --remote --command "
  UPDATE content SET updated_at = created_at;
  "
fi

# Check if archive_status column exists, if not add it
ARCHIVE_STATUS_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "archive_status")
if [ "$ARCHIVE_STATUS_COL_EXISTS" -eq "0" ]; then
  echo "Adding archive_status column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN archive_status TEXT DEFAULT 'active';"
fi

# Check if community_archive_eligible column exists, if not add it
ARCHIVE_ELIGIBLE_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "community_archive_eligible")
if [ "$ARCHIVE_ELIGIBLE_COL_EXISTS" -eq "0" ]; then
  echo "Adding community_archive_eligible column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN community_archive_eligible INTEGER DEFAULT 0;"
fi

# Check if archive_votes_count column exists, if not add it
VOTES_COUNT_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "archive_votes_count")
if [ "$VOTES_COUNT_COL_EXISTS" -eq "0" ]; then
  echo "Adding archive_votes_count column..."
  npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN archive_votes_count INTEGER DEFAULT 0;"
fi

echo "Content table schema update complete!"
