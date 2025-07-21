-- Migration for content associations
CREATE TABLE IF NOT EXISTS content_associations (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  weight INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Index for faster association lookups
CREATE INDEX IF NOT EXISTS idx_content_associations_content_id ON content_associations(content_id);
CREATE INDEX IF NOT EXISTS idx_content_associations_target_id ON content_associations(target_id);
CREATE INDEX IF NOT EXISTS idx_content_associations_type ON content_associations(type);

-- Table for community archive votes
CREATE TABLE IF NOT EXISTS community_archive_votes (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(content_id, user_id)
);

-- Index for faster vote counting
CREATE INDEX IF NOT EXISTS idx_community_archive_votes_content_id ON community_archive_votes(content_id);
