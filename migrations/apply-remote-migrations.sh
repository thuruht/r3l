#!/bin/bash

# Script to apply migrations to remote database with structure checks

echo "Applying migrations to remote database with structure checks"
echo "This will ensure all necessary tables and columns exist for R3L:F to function properly."

# Check if users table exists
USER_TABLE_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users'")
USER_COUNT=$(echo "$USER_TABLE_EXISTS" | grep -A 2 "count" | tail -n 1 | tr -d '│' | xargs)

if [ "$USER_COUNT" -eq "0" ]; then
  echo "Creating users table..."
  npx wrangler d1 execute r3l-db --remote --command "
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    bio TEXT,
    avatar_key TEXT,
    orcid_id TEXT,
    github_id TEXT,
    preferences TEXT,
    created_at INTEGER NOT NULL,
    last_login INTEGER
  );"
  echo "Created users table."
else
  echo "Users table already exists, checking columns..."
  
  # Check if github_id column exists
  GITHUB_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(users)" | grep -c "github_id")
  if [ "$GITHUB_COL_EXISTS" -eq "0" ]; then
    echo "Adding github_id column to users table..."
    npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE users ADD COLUMN github_id TEXT;"
  fi
  
  # Check if orcid_id column exists
  ORCID_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(users)" | grep -c "orcid_id")
  if [ "$ORCID_COL_EXISTS" -eq "0" ]; then
    echo "Adding orcid_id column to users table..."
    npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE users ADD COLUMN orcid_id TEXT;"
  fi
fi

# Check if auth_sessions table exists
SESSION_TABLE_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='auth_sessions'")
SESSION_COUNT=$(echo "$SESSION_TABLE_EXISTS" | grep -A 2 "count" | tail -n 1 | tr -d '│' | xargs)

if [ "$SESSION_COUNT" -eq "0" ]; then
  echo "Creating auth_sessions table..."
  npx wrangler d1 execute r3l-db --remote --command "
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );"
  echo "Created auth_sessions table."
fi

# Check if content_location table exists
LOCATION_TABLE_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='content_location'")
LOCATION_COUNT=$(echo "$LOCATION_TABLE_EXISTS" | grep -A 2 "count" | tail -n 1 | tr -d '│' | xargs)

if [ "$LOCATION_COUNT" -eq "0" ]; then
  echo "Creating content_location table..."
  npx wrangler d1 execute r3l-db --remote --command "
  CREATE TABLE IF NOT EXISTS content_location (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    location_name TEXT,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
  );"
  echo "Created content_location table."
fi

# Check content table for needed columns
CONTENT_TABLE_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='content'")
CONTENT_COUNT=$(echo "$CONTENT_TABLE_EXISTS" | grep -A 2 "count" | tail -n 1 | tr -d '│' | xargs)

if [ "$CONTENT_COUNT" -ne "0" ]; then
  echo "Content table exists, checking columns..."
  
  # Check if archive_status column exists
  ARCHIVE_STATUS_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "archive_status")
  if [ "$ARCHIVE_STATUS_COL_EXISTS" -eq "0" ]; then
    echo "Adding archive_status column to content table..."
    npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN archive_status TEXT DEFAULT 'active';"
  fi
  
  # Check if community_archive_eligible column exists
  ARCHIVE_ELIGIBLE_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "community_archive_eligible")
  if [ "$ARCHIVE_ELIGIBLE_COL_EXISTS" -eq "0" ]; then
    echo "Adding community_archive_eligible column to content table..."
    npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN community_archive_eligible INTEGER DEFAULT 0;"
  fi
  
  # Check if archive_votes_count column exists
  VOTES_COUNT_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "archive_votes_count")
  if [ "$VOTES_COUNT_COL_EXISTS" -eq "0" ]; then
    echo "Adding archive_votes_count column to content table..."
    npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN archive_votes_count INTEGER DEFAULT 0;"
  fi
  
  # Check if tags column exists
  TAGS_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "tags")
  if [ "$TAGS_COL_EXISTS" -eq "0" ]; then
    echo "Adding tags column to content table..."
    npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN tags TEXT;"
  fi
  
  # Check if expires_at column exists
  EXPIRES_COL_EXISTS=$(npx wrangler d1 execute r3l-db --remote --command "PRAGMA table_info(content)" | grep -c "expires_at")
  if [ "$EXPIRES_COL_EXISTS" -eq "0" ]; then
    echo "Adding expires_at column to content table..."
    npx wrangler d1 execute r3l-db --remote --command "ALTER TABLE content ADD COLUMN expires_at INTEGER DEFAULT (unixepoch() + 604800);"
  fi
else
  echo "Content table doesn't exist, creating it..."
  npx wrangler d1 execute r3l-db --remote --command "
  CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT,
    file_key TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    archive_status TEXT NOT NULL DEFAULT 'active',
    community_archive_eligible INTEGER NOT NULL DEFAULT 0,
    archive_votes_count INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER DEFAULT (unixepoch() + 604800)
  );"
  echo "Created content table."
fi

# Create remaining tables needed for the application
echo "Creating remaining required tables..."

# Drawers table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS drawers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);"

# Content associations table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_associations (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  drawer_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE CASCADE
);"

# Content copies table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_copies (
  id TEXT PRIMARY KEY,
  original_content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (original_content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);"

# Content downloads table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_downloads (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  downloaded_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);"

# System stats table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS system_stats (
  id TEXT PRIMARY KEY,
  total_active_content INTEGER NOT NULL DEFAULT 0,
  archive_threshold_percentage REAL NOT NULL DEFAULT 5.0,
  last_updated INTEGER NOT NULL
);"

# Content lifecycle table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_lifecycle (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  marked_for_deletion_at INTEGER,
  archived_at INTEGER,
  archive_type TEXT CHECK(archive_type IN ('personal', 'community', NULL)),
  FOREIGN KEY (content_id) REFERENCES content(id)
);"

# Community archive votes table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS community_archive_votes (
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('bookmark', 'co_archive')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (content_id, user_id, vote_type)
);"

# Tag usage table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS tag_usage (
  tag TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);"

# Notifications table
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);"

echo "Migration complete! The R3L:F database should now be fully configured."
