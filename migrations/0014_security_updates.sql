-- 0014_security_updates.sql
-- Updates users and files for Phase 9 Security.

-- 1. E2EE Support
ALTER TABLE users ADD COLUMN public_key TEXT;
ALTER TABLE users ADD COLUMN encrypted_private_key TEXT; -- Wrapped key for recovery

-- 2. Recovery Support
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_expires DATETIME;

-- 3. Ephemeral Controls
ALTER TABLE files ADD COLUMN burn_on_read BOOLEAN DEFAULT FALSE;

-- 4. Correct Verification State
UPDATE users SET verification_token = lower(hex(randomblob(16))) WHERE verification_token IS NULL;
