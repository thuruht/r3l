-- Migration to update notifications table schema to match current requirements
-- This adds title, action_url and changes 'read' field to 'is_read' for better consistency

-- First, check if we need to modify the notifications table
SELECT COUNT(*) AS table_exists FROM sqlite_master WHERE type='table' AND name='notifications';

-- If the table exists, we'll update it
DROP TABLE IF EXISTS notifications_new;

CREATE TABLE notifications_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  action_url TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table if it exists
INSERT OR IGNORE INTO notifications_new (id, user_id, type, title, content, is_read, created_at)
SELECT id, user_id, type, 'Notification', message, read, created_at
FROM notifications;

-- Drop the old table and rename the new one
DROP TABLE IF EXISTS notifications;
ALTER TABLE notifications_new RENAME TO notifications;

-- Recreate indices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
