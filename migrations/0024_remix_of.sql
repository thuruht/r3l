-- Add remix_of column to track derivative artifacts
ALTER TABLE files ADD COLUMN remix_of INTEGER REFERENCES files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_files_remix_of ON files(remix_of);
