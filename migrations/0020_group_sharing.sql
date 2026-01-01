-- Group file sharing and collaborative editing
CREATE TABLE IF NOT EXISTS group_files (
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

-- Community archiving votes
CREATE TABLE IF NOT EXISTS archive_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_weight INTEGER DEFAULT 1,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(file_id, user_id)
);

-- Track archive status
ALTER TABLE files ADD COLUMN archive_votes INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN is_community_archived INTEGER DEFAULT 0;

-- Group type for Sym groups
ALTER TABLE groups ADD COLUMN group_type TEXT DEFAULT 'chat' CHECK(group_type IN ('chat', 'sym_group'));

CREATE INDEX IF NOT EXISTS idx_group_files_group ON group_files(group_id);
CREATE INDEX IF NOT EXISTS idx_group_files_file ON group_files(file_id);
CREATE INDEX IF NOT EXISTS idx_archive_votes_file ON archive_votes(file_id);
