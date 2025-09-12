-- Add ephemeral content tracking
ALTER TABLE content ADD COLUMN expires_at INTEGER NOT NULL DEFAULT (unixepoch() + 604800); -- 7 days

CREATE TABLE IF NOT EXISTS content_lifecycle (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  marked_for_deletion_at INTEGER,
  archived_at INTEGER,
  archive_type TEXT CHECK(archive_type IN ('personal', 'community', NULL)),
  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE TABLE IF NOT EXISTS community_archive_votes (
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('bookmark', 'co_archive')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (content_id, user_id, vote_type)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_expires_at ON content(expires_at);
CREATE INDEX IF NOT EXISTS idx_content_archive_status ON content(archive_status);
CREATE INDEX IF NOT EXISTS idx_content_lifecycle_expires_at ON content_lifecycle(expires_at);
CREATE INDEX IF NOT EXISTS idx_content_lifecycle_content_id ON content_lifecycle(content_id);
CREATE INDEX IF NOT EXISTS idx_community_archive_votes_content_id ON community_archive_votes(content_id);
