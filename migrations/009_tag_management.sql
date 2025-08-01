-- Migration: Tag Management
-- Description: Add tag_usage table and modify content table to support tags

-- Create table for tracking tag usage
CREATE TABLE IF NOT EXISTS tag_usage (
  tag TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- Add index for faster tag searches
CREATE INDEX IF NOT EXISTS idx_tag_usage_count ON tag_usage(count DESC);
