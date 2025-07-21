#!/bin/bash

# Script to apply migrations to remote database with structure checks

echo "Applying migrations to remote database with structure checks"
echo "This will ensure all necessary tables and columns exist for R3L:F to function properly."

# Create users table
echo "Creating users table if it doesn't exist..."
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

# Create auth_sessions table
echo "Creating auth_sessions table if it doesn't exist..."
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

# Create or update content table
echo "Creating content table if it doesn't exist..."
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
  archive_status TEXT DEFAULT 'active',
  community_archive_eligible INTEGER DEFAULT 0,
  archive_votes_count INTEGER DEFAULT 0,
  expires_at INTEGER DEFAULT (unixepoch() + 604800)
);"

# Create content_location table
echo "Creating content_location table if it doesn't exist..."
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_location (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  location_name TEXT,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);"

# Create drawers table
echo "Creating drawers table if it doesn't exist..."
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

# Create content_associations table
echo "Creating content_associations table if it doesn't exist..."
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_associations (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  drawer_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE CASCADE
);"

# Create content_copies table
echo "Creating content_copies table if it doesn't exist..."
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

# Create content_downloads table
echo "Creating content_downloads table if it doesn't exist..."
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS content_downloads (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  downloaded_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);"

# Create system_stats table
echo "Creating system_stats table if it doesn't exist..."
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS system_stats (
  id TEXT PRIMARY KEY,
  total_active_content INTEGER NOT NULL DEFAULT 0,
  archive_threshold_percentage REAL NOT NULL DEFAULT 5.0,
  last_updated INTEGER NOT NULL
);"

# Create content_lifecycle table
echo "Creating content_lifecycle table if it doesn't exist..."
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

# Create community_archive_votes table
echo "Creating community_archive_votes table if it doesn't exist..."
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS community_archive_votes (
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('bookmark', 'co_archive')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (content_id, user_id, vote_type)
);"

# Create tag_usage table
echo "Creating tag_usage table if it doesn't exist..."
npx wrangler d1 execute r3l-db --remote --command "
CREATE TABLE IF NOT EXISTS tag_usage (
  tag TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);"

# Create notifications table
echo "Creating notifications table if it doesn't exist..."
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

# Create indices for better performance
echo "Creating indices for better performance..."

# Content indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category);
CREATE INDEX IF NOT EXISTS idx_content_is_public ON content(is_public);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_content_archive_status ON content(archive_status);
CREATE INDEX IF NOT EXISTS idx_content_expires_at ON content(expires_at);
CREATE INDEX IF NOT EXISTS fts_content_title ON content(title);
CREATE INDEX IF NOT EXISTS fts_content_description ON content(description);
CREATE INDEX IF NOT EXISTS fts_content_tags ON content(tags);"

# Content location indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_content_location_content_id ON content_location(content_id);
CREATE INDEX IF NOT EXISTS idx_content_location_lat ON content_location(lat);
CREATE INDEX IF NOT EXISTS idx_content_location_lng ON content_location(lng);"

# Auth sessions indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);"

# Drawers indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_drawers_user_id ON drawers(user_id);
CREATE INDEX IF NOT EXISTS idx_drawers_is_public ON drawers(is_public);"

# Content associations indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_content_associations_content_id ON content_associations(content_id);
CREATE INDEX IF NOT EXISTS idx_content_associations_drawer_id ON content_associations(drawer_id);"

# Content copies indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_content_copies_original_content_id ON content_copies(original_content_id);
CREATE INDEX IF NOT EXISTS idx_content_copies_user_id ON content_copies(user_id);"

# Content downloads indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_content_downloads_content_id ON content_downloads(content_id);
CREATE INDEX IF NOT EXISTS idx_content_downloads_user_id ON content_downloads(user_id);"

# Content lifecycle indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_content_lifecycle_content_id ON content_lifecycle(content_id);
CREATE INDEX IF NOT EXISTS idx_content_lifecycle_expires_at ON content_lifecycle(expires_at);"

# Community archive votes indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_community_archive_votes_content_id ON community_archive_votes(content_id);"

# Tag usage index
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_tag_usage_count ON tag_usage(count DESC);"

# Notifications indices
npx wrangler d1 execute r3l-db --remote --command "
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);"

# Insert initial system stats if they don't exist
npx wrangler d1 execute r3l-db --remote --command "
INSERT OR IGNORE INTO system_stats (id, total_active_content, archive_threshold_percentage, last_updated)
VALUES ('global_stats', 0, 5.0, unixepoch());"

echo "Migration complete! The R3L:F database should now be fully configured."
