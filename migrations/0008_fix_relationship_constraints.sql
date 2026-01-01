-- Migration number: 0008 	 2025-12-25T00:00:00.000Z

-- Rename old table
ALTER TABLE relationships RENAME TO relationships_old;

-- Create new table with updated constraints
CREATE TABLE relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_user_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('asym_follow', 'sym_request', 'sym_accepted')),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (source_user_id, target_user_id)
);

-- Copy data
INSERT INTO relationships (id, source_user_id, target_user_id, type, status, created_at, updated_at)
SELECT id, source_user_id, target_user_id, type, status, created_at, updated_at FROM relationships_old;

-- Drop old table
DROP TABLE relationships_old;
