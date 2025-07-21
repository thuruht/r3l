-- Migration for content and content location tables
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
  community_archive_eligible INTEGER NOT NULL DEFAULT 0
);

-- Indices for content
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category);
CREATE INDEX IF NOT EXISTS idx_content_is_public ON content(is_public);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_content_archive_status ON content(archive_status);
CREATE INDEX IF NOT EXISTS fts_content_title ON content(title);
CREATE INDEX IF NOT EXISTS fts_content_description ON content(description);
CREATE INDEX IF NOT EXISTS fts_content_tags ON content(tags);

-- Content location table
CREATE TABLE IF NOT EXISTS content_location (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  location_name TEXT,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Indices for content location
CREATE INDEX IF NOT EXISTS idx_content_location_content_id ON content_location(content_id);
CREATE INDEX IF NOT EXISTS idx_content_location_lat ON content_location(lat);
CREATE INDEX IF NOT EXISTS idx_content_location_lng ON content_location(lng);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
