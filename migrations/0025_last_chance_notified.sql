-- Add flag to prevent duplicate "last chance" notifications per file
ALTER TABLE files ADD COLUMN last_chance_notified INTEGER NOT NULL DEFAULT 0;
