-- Migration number: 0016_add_missing_indexes.sql
-- Add indexes for improved query performance on frequently accessed columns.

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email); -- email is already unique, but explicit index is good.

-- Notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications(user_id, created_at DESC);

-- Relationships table
CREATE INDEX IF NOT EXISTS idx_relationships_source_target_type ON relationships(source_user_id, target_user_id, type);
CREATE INDEX IF NOT EXISTS idx_relationships_target_source_type ON relationships(target_user_id, source_user_id, type); -- For reverse lookups

-- Mutual Connections table
CREATE INDEX IF NOT EXISTS idx_mutual_connections_users ON mutual_connections(user_a_id, user_b_id);

-- Files table
CREATE INDEX IF NOT EXISTS idx_files_user_visibility_created_at ON files(user_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_r2_key ON files(r2_key);

-- Collections table
CREATE INDEX IF NOT EXISTS idx_collections_user_id_updated_at ON collections(user_id, updated_at DESC);

-- Collection_files table
CREATE INDEX IF NOT EXISTS idx_collection_files_collection_file ON collection_files(collection_id, file_id);
