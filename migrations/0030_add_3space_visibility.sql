-- Add '3space' visibility level to files table CHECK constraint
-- 3SPACE visibility means: owner-only + visible to 3space partners

ALTER TABLE files RENAME TO files_old;

CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  r2_key TEXT UNIQUE NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'sym'
    CHECK(visibility IN ('public', 'sym', 'me', '3space')),
  is_archived BOOLEAN DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  vitality INTEGER DEFAULT 0,
  is_encrypted INTEGER DEFAULT 0,
  iv TEXT,
  parent_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
  burn_on_read BOOLEAN DEFAULT FALSE,
  tags TEXT,
  archive_votes INTEGER DEFAULT 0,
  is_community_archived INTEGER DEFAULT 0,
  remix_of INTEGER REFERENCES files(id) ON DELETE SET NULL,
  last_chance_notified INTEGER NOT NULL DEFAULT 0,
  workspace_id INTEGER REFERENCES workspaces(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO files SELECT * FROM files_old;

DROP TABLE files_old;

CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at) WHERE is_archived = 0;
CREATE INDEX IF NOT EXISTS idx_files_user_visibility_created_at ON files(user_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_r2_key ON files(r2_key);
CREATE INDEX IF NOT EXISTS idx_files_tags ON files(tags);
CREATE INDEX IF NOT EXISTS idx_files_remix_of ON files(remix_of);
