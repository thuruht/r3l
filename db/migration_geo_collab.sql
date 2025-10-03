-- Migration for geo-location, enhanced collaboration, and tagging features

-- Geo-location table for map points
CREATE TABLE IF NOT EXISTS geo_locations (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    contentId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    isPublic INTEGER DEFAULT 1,
    createdAt INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Collaboration rooms
CREATE TABLE IF NOT EXISTS collaboration_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    ownerId TEXT NOT NULL,
    isPublic INTEGER DEFAULT 0,
    createdAt INTEGER DEFAULT (unixepoch()) NOT NULL,
    updatedAt INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Collaboration room members
CREATE TABLE IF NOT EXISTS collaboration_members (
    roomId TEXT NOT NULL,
    userId TEXT NOT NULL,
    joinedAt INTEGER DEFAULT (unixepoch()) NOT NULL,
    PRIMARY KEY (roomId, userId)
);

-- Content tags
CREATE TABLE IF NOT EXISTS content_tags (
    contentId TEXT NOT NULL,
    tag TEXT NOT NULL,
    createdAt INTEGER DEFAULT (unixepoch()) NOT NULL,
    PRIMARY KEY (contentId, tag)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_geo_locations_user ON geo_locations(userId);
CREATE INDEX IF NOT EXISTS idx_geo_locations_coords ON geo_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_geo_locations_public ON geo_locations(isPublic, createdAt);
CREATE INDEX IF NOT EXISTS idx_collaboration_rooms_owner ON collaboration_rooms(ownerId);
CREATE INDEX IF NOT EXISTS idx_collaboration_rooms_public ON collaboration_rooms(isPublic, updatedAt);
CREATE INDEX IF NOT EXISTS idx_collaboration_members_user ON collaboration_members(userId);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag ON content_tags(tag);
