-- One archive vote per user per file (prevents a single user from spamming files into the archive)
CREATE TABLE IF NOT EXISTS archive_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(file_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_archive_votes_file ON archive_votes(file_id);
