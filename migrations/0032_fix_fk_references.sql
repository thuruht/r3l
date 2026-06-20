-- Migration 0030's ALTER TABLE files RENAME TO files_old caused SQLite to
-- auto-update FK references in existing tables to point to files_old instead
-- of the new files table. The old files_old table was then dropped, leaving
-- dangling FK references that fail when FK enforcement checks them.
-- This migration recreates those FK constraints to point to the correct table.

-- vitality_votes
CREATE TABLE IF NOT EXISTS vitality_votes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(file_id, user_id)
);
INSERT OR IGNORE INTO vitality_votes_new SELECT * FROM vitality_votes;
DROP TABLE vitality_votes;
ALTER TABLE vitality_votes_new RENAME TO vitality_votes;
CREATE INDEX IF NOT EXISTS idx_vitality_votes_file ON vitality_votes(file_id);

-- archive_votes
CREATE TABLE IF NOT EXISTS archive_votes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_weight INTEGER DEFAULT 1,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(file_id, user_id)
);
INSERT OR IGNORE INTO archive_votes_new SELECT * FROM archive_votes;
DROP TABLE archive_votes;
ALTER TABLE archive_votes_new RENAME TO archive_votes;
CREATE INDEX IF NOT EXISTS idx_archive_votes_file ON archive_votes(file_id);

-- file_keys
CREATE TABLE IF NOT EXISTS file_keys_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(file_id, user_id)
);
INSERT OR IGNORE INTO file_keys_new SELECT * FROM file_keys;
DROP TABLE file_keys;
ALTER TABLE file_keys_new RENAME TO file_keys;
CREATE INDEX IF NOT EXISTS idx_file_keys_file_user ON file_keys(file_id, user_id);

-- collection_files
CREATE TABLE IF NOT EXISTS collection_files_new (
    collection_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    file_order INTEGER NOT NULL,
    PRIMARY KEY (collection_id, file_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
INSERT OR IGNORE INTO collection_files_new SELECT * FROM collection_files;
DROP TABLE collection_files;
ALTER TABLE collection_files_new RENAME TO collection_files;
CREATE INDEX IF NOT EXISTS idx_collection_files_collection_id ON collection_files (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_files_file_id ON collection_files (file_id);

-- group_files
CREATE TABLE IF NOT EXISTS group_files_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    shared_by INTEGER NOT NULL,
    can_edit INTEGER DEFAULT 0,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by) REFERENCES users(id),
    UNIQUE(group_id, file_id)
);
INSERT OR IGNORE INTO group_files_new SELECT * FROM group_files;
DROP TABLE group_files;
ALTER TABLE group_files_new RENAME TO group_files;
CREATE INDEX IF NOT EXISTS idx_group_files_group ON group_files(group_id);
CREATE INDEX IF NOT EXISTS idx_group_files_file ON group_files(file_id);
