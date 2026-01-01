-- Migration number: 0012 	 2025-12-20T00:00:00.000Z

-- Add archiving and encryption support to messages
ALTER TABLE messages ADD COLUMN is_archived INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN is_encrypted INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN iv TEXT;

-- Add encryption support to files
ALTER TABLE files ADD COLUMN is_encrypted INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN iv TEXT;
