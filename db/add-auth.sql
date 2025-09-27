-- Add missing auth columns to existing users table
ALTER TABLE users ADD COLUMN passwordHash TEXT;
ALTER TABLE users ADD COLUMN recoveryHash TEXT;