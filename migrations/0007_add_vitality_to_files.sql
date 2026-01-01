-- Migration number: 0007 	 2025-12-16T00:00:00.000Z
-- Add vitality column for community voting/archiving features
ALTER TABLE files ADD COLUMN vitality INTEGER DEFAULT 0;

-- Optional: Add an index for vitality if we plan to query high-vitality files frequently
-- CREATE INDEX idx_files_vitality ON files(vitality);
