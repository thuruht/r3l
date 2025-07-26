-- Migration to update direct_messages table schema to support attachments
-- This adds the attachments column to the direct_messages table

-- Check if we need to modify the direct_messages table
PRAGMA foreign_keys=off;

-- Add attachments column if it doesn't exist already
ALTER TABLE direct_messages ADD COLUMN attachments TEXT;

-- Create a new index for the attachments column
CREATE INDEX IF NOT EXISTS idx_direct_messages_attachments
ON direct_messages (attachments) WHERE attachments IS NOT NULL;

PRAGMA foreign_keys=on;
