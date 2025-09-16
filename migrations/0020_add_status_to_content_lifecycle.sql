-- Add status to content_lifecycle table
ALTER TABLE content_lifecycle
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Add an index on the status column for faster querying
CREATE INDEX idx_content_lifecycle_status ON content_lifecycle (status);
