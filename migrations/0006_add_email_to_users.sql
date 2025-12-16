-- Migration number: 0006 	 2025-12-15T00:00:00.000Z
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_token TEXT;
CREATE UNIQUE INDEX idx_users_email ON users(email);