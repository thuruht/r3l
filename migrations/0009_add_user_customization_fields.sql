-- Migration for Phase 7: Deep Customization (User Preferences)

-- Add theme_preferences to users table
ALTER TABLE users ADD COLUMN theme_preferences TEXT DEFAULT '{}';

-- Add profile aesthetic fields to users table
ALTER TABLE users ADD COLUMN node_primary_color TEXT DEFAULT '#1F77B4'; -- Default blue
ALTER TABLE users ADD COLUMN node_secondary_color TEXT DEFAULT '#FF7F0E'; -- Default orange
ALTER TABLE users ADD COLUMN node_size INTEGER DEFAULT 8; -- Default node size
