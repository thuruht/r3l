-- Migration: Add performance indexes to improve query performance
-- This migration adds indexes to frequently queried columns to improve performance

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_content_visibility ON content(visibility);
CREATE INDEX IF NOT EXISTS idx_content_expires_at ON content(expires_at);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

-- Connection indexes
CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(user_id, connected_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_type ON connections(type);

-- Drawer indexes
CREATE INDEX IF NOT EXISTS idx_drawers_user_id ON drawers(user_id);
CREATE INDEX IF NOT EXISTS idx_drawers_visibility ON drawers(visibility);

-- Drawer content indexes
CREATE INDEX IF NOT EXISTS idx_drawer_content_drawer_id ON drawer_content(drawer_id);
CREATE INDEX IF NOT EXISTS idx_drawer_content_content_id ON drawer_content(content_id);

-- Association indexes
CREATE INDEX IF NOT EXISTS idx_content_associations_source_id ON content_associations(source_content_id);
CREATE INDEX IF NOT EXISTS idx_content_associations_target_id ON content_associations(target_content_id);
CREATE INDEX IF NOT EXISTS idx_content_associations_type ON content_associations(association_type);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Archive vote indexes
CREATE INDEX IF NOT EXISTS idx_archive_votes_content_id ON archive_votes(content_id);
CREATE INDEX IF NOT EXISTS idx_archive_votes_user_id ON archive_votes(user_id);

-- Tag indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);

-- Geo point indexes
CREATE INDEX IF NOT EXISTS idx_geo_points_user_id ON geo_points(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_points_content_id ON geo_points(content_id);
CREATE INDEX IF NOT EXISTS idx_geo_points_coordinates ON geo_points(latitude, longitude);

-- Auth logs indexes
CREATE INDEX IF NOT EXISTS idx_auth_log_user_id ON auth_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_log_action ON auth_log(action);
CREATE INDEX IF NOT EXISTS idx_auth_log_timestamp ON auth_log(timestamp);
