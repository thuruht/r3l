-- Add index for expires_at to optimize cron cleanup
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at) WHERE is_archived = 0;

-- Add index for message cleanup
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at) WHERE is_archived = 0;

-- Add index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
