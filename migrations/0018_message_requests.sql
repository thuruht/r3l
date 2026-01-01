-- Add message request support
ALTER TABLE messages ADD COLUMN is_request INTEGER DEFAULT 0;

-- Add index for filtering message requests
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(receiver_id, is_request, created_at);
