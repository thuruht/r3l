-- Migration for content copying and enhanced archive voting

-- Table to track content copies (when users copy content to their drawer)
CREATE TABLE IF NOT EXISTS content_copies (
  id TEXT PRIMARY KEY,
  original_content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (original_content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indices for content copies
CREATE INDEX IF NOT EXISTS idx_content_copies_original_content_id ON content_copies(original_content_id);
CREATE INDEX IF NOT EXISTS idx_content_copies_user_id ON content_copies(user_id);

-- Add a column to track archive votes count for easier threshold calculation
ALTER TABLE content ADD COLUMN IF NOT EXISTS archive_votes_count INTEGER NOT NULL DEFAULT 0;

-- Table to track download counts
CREATE TABLE IF NOT EXISTS content_downloads (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  downloaded_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indices for content downloads
CREATE INDEX IF NOT EXISTS idx_content_downloads_content_id ON content_downloads(content_id);
CREATE INDEX IF NOT EXISTS idx_content_downloads_user_id ON content_downloads(user_id);

-- Add a column to track total content count for percentage threshold calculation
CREATE TABLE IF NOT EXISTS system_stats (
  id TEXT PRIMARY KEY,
  total_active_content INTEGER NOT NULL DEFAULT 0,
  archive_threshold_percentage REAL NOT NULL DEFAULT 5.0, -- Default 5%
  last_updated INTEGER NOT NULL
);

-- Insert initial system stats
INSERT OR IGNORE INTO system_stats (id, total_active_content, archive_threshold_percentage, last_updated)
VALUES ('global_stats', 0, 5.0, unixepoch());
