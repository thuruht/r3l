-- 0015_refinement_phase.sql
-- Updates for Refinement Phase (Tagging, E2EE Key Management)

-- 1. Add tags to files
ALTER TABLE files ADD COLUMN tags TEXT; -- Comma-separated tags

-- 2. Create file_keys table for E2EE sharing
CREATE TABLE IF NOT EXISTS file_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  encrypted_key TEXT NOT NULL, -- The file's AES key wrapped with user_id's Public Key
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(file_id, user_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_tags ON files(tags);
CREATE INDEX IF NOT EXISTS idx_file_keys_file_user ON file_keys(file_id, user_id);
