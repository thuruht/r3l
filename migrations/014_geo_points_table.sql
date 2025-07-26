-- Migration 014: Create geo_points table for map feature

-- Create geo_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS geo_points (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  content_id TEXT,
  content_type TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (content_id) REFERENCES content(id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_geo_points_user_id ON geo_points(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_points_public ON geo_points(is_public);
CREATE INDEX IF NOT EXISTS idx_geo_points_content_id ON geo_points(content_id);
CREATE INDEX IF NOT EXISTS idx_geo_points_created_at ON geo_points(created_at);

-- Create spatial index for lat/long (SQLite doesn't have true spatial indexes, but this helps)
CREATE INDEX IF NOT EXISTS idx_geo_points_coords ON geo_points(latitude, longitude);

-- Record this migration
INSERT INTO d1_migrations (id, name, applied_at) 
VALUES (14, '014_geo_points_table', unixepoch())
ON CONFLICT DO NOTHING;
