-- Migration number: 0004 	 2025-12-15T00:00:00.000Z

-- Table for file metadata (linked to R2 objects)
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  r2_key TEXT UNIQUE NOT NULL, -- The key used in the R2 bucket
  filename TEXT NOT NULL,      -- Original filename for display
  size INTEGER NOT NULL,       -- Size in bytes
  mime_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'sym' CHECK(visibility IN ('public', 'sym', 'me')),
  is_archived BOOLEAN DEFAULT 0, -- If 1, prevents auto-deletion
  expires_at DATETIME NOT NULL,  -- The scheduled deletion time (if not archived)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for expiration cleanup jobs
CREATE INDEX idx_files_expires_at ON files(expires_at) WHERE is_archived = 0;
