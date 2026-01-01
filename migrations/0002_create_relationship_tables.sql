-- Migration number: 0002 	 2025-12-14T00:00:00.000Z

-- Table for directed relationships (e.g., "asym" follows, or "sym" requests)
CREATE TABLE relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_user_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('asym_follow', 'sym_request')), -- asym_follow: A follows B; sym_request: A requested B for a sym link
  status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (source_user_id, target_user_id)
);

-- Table for mutually accepted "sym" connections
CREATE TABLE mutual_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id INTEGER NOT NULL, -- Ensure user_a_id < user_b_id for uniqueness
  user_b_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_a_id, user_b_id)
);

-- Table for user-specific visibility preferences (the "3rd space" permanent hide list)
CREATE TABLE user_visibility_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  hidden_user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hidden_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, hidden_user_id)
);
