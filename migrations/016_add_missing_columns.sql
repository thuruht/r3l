-- Migration: Add missing columns and tables
-- Description: Add avatar_url column to users table and create tags table

-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Create tags table for proper tag management
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create content_tags junction table
CREATE TABLE IF NOT EXISTS content_tags (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Add active column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1;