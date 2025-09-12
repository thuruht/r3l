-- Migration 017: Create normalized connections table
-- Description: Add normalized user_id/connected_user_id columns while preserving legacy ORCID columns
-- This enables gradual transition from ORCID-based to user-ID-based connections

-- Create the normalized connections table with both new and legacy columns
CREATE TABLE IF NOT EXISTS connections_normalized (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  connected_user_id TEXT,
  user_a_orcid TEXT,
  user_b_orcid TEXT,
  type TEXT DEFAULT 'mutual',
  status TEXT DEFAULT 'accepted',
  message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (connected_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connections_user ON connections_normalized(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_connected_user ON connections_normalized(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections_normalized(status);

-- Migrate existing connections data if the old table exists
-- This safely maps ORCID-based connections to user ID connections where possible
INSERT OR IGNORE INTO connections_normalized (
  id, user_id, connected_user_id, user_a_orcid, user_b_orcid, 
  type, status, message, created_at, updated_at
)
SELECT 
  COALESCE(c.id, lower(hex(randomblob(16)))),
  ua.id AS user_id,
  ub.id AS connected_user_id,
  c.user_a_orcid,
  c.user_b_orcid,
  COALESCE(c.type, 'mutual'),
  COALESCE(c.status, 'accepted'),
  c.message,
  COALESCE(c.created_at, strftime('%s', 'now') * 1000),
  COALESCE(c.updated_at, strftime('%s', 'now') * 1000)
FROM connections c
LEFT JOIN users ua ON ua.orcid_id = c.user_a_orcid
LEFT JOIN users ub ON ub.orcid_id = c.user_b_orcid
WHERE ua.id IS NOT NULL AND ub.id IS NOT NULL;

-- Rename tables: backup old, promote new
-- Only do this if migration was successful
DROP TABLE IF EXISTS connections_backup;
ALTER TABLE connections RENAME TO connections_backup;
ALTER TABLE connections_normalized RENAME TO connections;

-- Add any missing columns that might be expected by the application
ALTER TABLE connections ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'mutual';