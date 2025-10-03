-- Migration to add missing columns and tables for the existing schema

-- Ensure passwordHash and recoveryHash exist (already added based on schema check)
-- Add any missing indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_userId ON auth_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_content_userId ON content(userId);
CREATE INDEX IF NOT EXISTS idx_connections_followingId ON connections(followerId);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipientId, createdAt);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, createdAt);

-- Create user_visibility table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_visibility (
    userId TEXT PRIMARY KEY,
    mode TEXT DEFAULT 'normal',
    showInNetwork BOOLEAN DEFAULT 1,
    showInSearch BOOLEAN DEFAULT 1,
    allowDirectMessages BOOLEAN DEFAULT 1,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
