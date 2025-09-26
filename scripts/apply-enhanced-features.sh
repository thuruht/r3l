#!/bin/bash

# Apply enhanced features to the D1 database
echo "Applying enhanced features migration..."

# Create enhanced features SQL
cat > /tmp/enhanced_features.sql << 'EOF'
-- Enhanced features migration for R3L:F
-- Add content reactions table
CREATE TABLE IF NOT EXISTS content_reactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    contentId TEXT NOT NULL,
    userId TEXT NOT NULL,
    reaction TEXT NOT NULL CHECK (reaction IN ('like', 'love', 'archive', 'bookmark')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contentId, userId, reaction),
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Add user visibility preferences
CREATE TABLE IF NOT EXISTS user_visibility (
    userId TEXT PRIMARY KEY,
    mode TEXT DEFAULT 'normal' CHECK (mode IN ('normal', 'lurker')),
    showInNetwork BOOLEAN DEFAULT 1,
    showInSearch BOOLEAN DEFAULT 1,
    allowDirectMessages BOOLEAN DEFAULT 1,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Add collaborative workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    ownerId TEXT NOT NULL,
    isPublic BOOLEAN DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
);

-- Add workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
    workspaceId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspaceId, userId),
    FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Add content tags for better organization
CREATE TABLE IF NOT EXISTS content_tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    contentId TEXT NOT NULL,
    tag TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contentId, tag),
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_content_reactions_content ON content_reactions(contentId);
CREATE INDEX IF NOT EXISTS idx_content_reactions_user ON content_reactions(userId);
CREATE INDEX IF NOT EXISTS idx_content_reactions_type ON content_reactions(reaction);
CREATE INDEX IF NOT EXISTS idx_user_visibility_mode ON user_visibility(mode);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(ownerId);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(userId);
CREATE INDEX IF NOT EXISTS idx_content_tags_content ON content_tags(contentId);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag ON content_tags(tag);
EOF

npx wrangler d1 execute r3l-db --file=/tmp/enhanced_features.sql

echo "Enhanced features migration applied successfully!"
rm /tmp/enhanced_features.sql