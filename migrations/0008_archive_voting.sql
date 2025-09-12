-- Migration: Archive Voting and Daily Votes
-- Description: Add tables and fields for archive voting and daily vote allocation

-- Table for tracking copy/download actions that count as archive votes
CREATE TABLE IF NOT EXISTS content_archive_votes (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('copy', 'download', 'explicit')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Track daily explicit votes
CREATE TABLE IF NOT EXISTS user_daily_votes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  votes_used INTEGER NOT NULL DEFAULT 0,
  votes_available INTEGER NOT NULL DEFAULT 1,
  last_reset_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_content_archive_votes_content_id ON content_archive_votes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_archive_votes_user_id ON content_archive_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_votes_user_id ON user_daily_votes(user_id);

-- Add column to content table to track total archive votes
ALTER TABLE content ADD COLUMN archive_votes INTEGER NOT NULL DEFAULT 0;
