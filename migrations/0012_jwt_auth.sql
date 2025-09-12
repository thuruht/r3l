-- User credentials table for JWT authentication
CREATE TABLE IF NOT EXISTS user_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  recovery_key_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Authentication audit log
CREATE TABLE IF NOT EXISTS auth_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'login', 'logout', 'failed_login', 'password_reset', etc.
  success INTEGER NOT NULL DEFAULT 0, -- 0 = failure, 1 = success
  ip_address TEXT,
  user_agent TEXT,
  timestamp INTEGER NOT NULL,
  details TEXT, -- JSON with additional details
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index on user_id and timestamp for quick lookups
CREATE INDEX IF NOT EXISTS idx_auth_log_user_timestamp ON auth_log(user_id, timestamp);
