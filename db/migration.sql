-- Simple check - just add missing columns if table exists
PRAGMA table_info(users);

-- Add username column if missing
ALTER TABLE users ADD COLUMN username TEXT DEFAULT 'temp_user';

-- Add recoveryHash column if missing  
ALTER TABLE users ADD COLUMN recoveryHash TEXT;

-- Update usernames for existing users
UPDATE users SET username = 'user_' || substr(id, 1, 8) WHERE username = 'temp_user';