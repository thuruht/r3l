-- Migration number: 0003 	 2025-12-15T00:00:00.000Z

-- Table for user communiques (profiles/dashboards)
CREATE TABLE communiques (
  user_id INTEGER PRIMARY KEY,
  content TEXT DEFAULT '', -- The main text content of the communique
  theme_prefs TEXT DEFAULT '{}', -- JSON string for theme customization (e.g., accent colors)
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
