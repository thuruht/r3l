-- Migration for users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  orcid_id TEXT UNIQUE,
  avatar_key TEXT,
  preferences TEXT NOT NULL
);

-- Indices for users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_orcid_id ON users(orcid_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
