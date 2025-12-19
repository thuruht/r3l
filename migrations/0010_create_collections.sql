-- migrations/0010_create_collections.sql

-- Create Collections table
CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'private', -- 'private', 'public', 'sym'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Collection_Files join table
CREATE TABLE collection_files (
    collection_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    file_order INTEGER NOT NULL,
    PRIMARY KEY (collection_id, file_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_collections_user_id ON collections (user_id);
CREATE INDEX idx_collection_files_collection_id ON collection_files (collection_id);
CREATE INDEX idx_collection_files_file_id ON collection_files (file_id);
