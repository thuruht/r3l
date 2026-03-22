-- Migration number: 0026 	 2026-03-21T00:00:00.000Z
CREATE TABLE workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE workspace_members (
  workspace_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE files ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);
