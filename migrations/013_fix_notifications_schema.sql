-- Migration to create or fix notifications table schema
-- This ensures the notifications table exists with the proper structure

-- First check if the table exists
SELECT COUNT(*) AS table_exists FROM sqlite_master WHERE type='table' AND name='notifications';

-- Drop the old table if it exists to ensure clean schema
DROP TABLE IF EXISTS notifications;

-- Create the notifications table with the proper structure
CREATE TABLE notifications (
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

-- Create indices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
