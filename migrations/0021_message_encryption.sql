-- Migration: Add encrypted_key column for E2EE messages
ALTER TABLE messages ADD COLUMN encrypted_key TEXT;
