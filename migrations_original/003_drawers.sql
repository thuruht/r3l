-- Migration for drawer and drawer content tables
CREATE TABLE IF NOT EXISTS drawers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for drawers
CREATE INDEX IF NOT EXISTS idx_drawers_user_id ON drawers(user_id);
CREATE INDEX IF NOT EXISTS idx_drawers_is_public ON drawers(is_public);
CREATE INDEX IF NOT EXISTS idx_drawers_updated_at ON drawers(updated_at);

-- Drawer contents table
CREATE TABLE IF NOT EXISTS drawer_contents (
  id TEXT PRIMARY KEY,
  drawer_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE(drawer_id, content_id)
);

-- Indices for drawer contents
CREATE INDEX IF NOT EXISTS idx_drawer_contents_drawer_id ON drawer_contents(drawer_id);
CREATE INDEX IF NOT EXISTS idx_drawer_contents_content_id ON drawer_contents(content_id);
CREATE INDEX IF NOT EXISTS idx_drawer_contents_added_at ON drawer_contents(added_at);
