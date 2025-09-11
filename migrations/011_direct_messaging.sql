-- 010_direct_messaging.sql
-- Migration to add direct messaging tables to R3L:F
-- July 25, 2025

-- Direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_encrypted INTEGER DEFAULT 0,
  is_read INTEGER DEFAULT 0,
  deleted_for_sender INTEGER DEFAULT 0,
  deleted_for_recipient INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- Create index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_direct_messages_users 
ON direct_messages (from_user_id, to_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_direct_messages_to_user 
ON direct_messages (to_user_id, is_read);

-- Conversations table to track message threads between users
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id_a TEXT NOT NULL,
  user_id_b TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_message_at INTEGER NOT NULL,
  last_message_id TEXT,
  FOREIGN KEY (user_id_a) REFERENCES users(id),
  FOREIGN KEY (user_id_b) REFERENCES users(id),
  FOREIGN KEY (last_message_id) REFERENCES direct_messages(id)
);

-- Create index for faster conversation lookup
CREATE INDEX IF NOT EXISTS idx_conversations_users 
ON conversations (user_id_a, user_id_b);

CREATE INDEX IF NOT EXISTS idx_conversations_user_a 
ON conversations (user_id_a, last_message_at);

CREATE INDEX IF NOT EXISTS idx_conversations_user_b 
ON conversations (user_id_b, last_message_at);

-- Add encryption keys table for message encryption
CREATE TABLE IF NOT EXISTS user_encryption_keys (
  user_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
