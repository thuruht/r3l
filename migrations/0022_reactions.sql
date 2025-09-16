-- Migration for reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE(user_id, content_id, reaction)
);

-- Indices for reactions
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_content_id ON reactions(content_id);
CREATE INDEX IF NOT EXISTS idx_reactions_reaction ON reactions(reaction);
