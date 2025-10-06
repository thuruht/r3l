-- Users and authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    recoveryHash TEXT,
    display_name TEXT,
    bio TEXT,
    avatar_key TEXT,
    preferences TEXT,
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_auth_sessions_userId ON auth_sessions(userId);

-- Content
CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_content_userId ON content(userId);

CREATE TABLE IF NOT EXISTS content_location (
    contentId TEXT PRIMARY KEY NOT NULL,
    objectKey TEXT NOT NULL UNIQUE,
    contentType TEXT,
    fileSize INTEGER,
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_lifecycle (
    contentId TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    expiresAt TIMESTAMP,
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE
);
CREATE INDEX idx_content_lifecycle_status ON content_lifecycle(status, expiresAt);

-- Social
CREATE TABLE IF NOT EXISTS connections (
    followerId TEXT NOT NULL,
    followingId TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (followerId, followingId),
    FOREIGN KEY (followerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followingId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_connections_followingId ON connections(followingId);

CREATE TABLE IF NOT EXISTS bookmarks (
    userId TEXT NOT NULL,
    contentId TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (userId, contentId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    contentId TEXT NOT NULL,
    parentCommentId TEXT,
    comment TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (parentCommentId) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_contentId ON comments(contentId);

CREATE TABLE IF NOT EXISTS content_reactions (
    id TEXT PRIMARY KEY,
    contentId TEXT NOT NULL,
    userId TEXT NOT NULL,
    reaction TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(contentId, userId, reaction),
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_archive_votes (
    contentId TEXT NOT NULL,
    userId TEXT NOT NULL,
    voteType TEXT NOT NULL DEFAULT 'archive',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (contentId, userId),
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Messaging
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    recipientId TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    isRead BOOLEAN DEFAULT 0,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_recipient ON messages(recipientId, createdAt);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    actionUrl TEXT,
    isRead BOOLEAN DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user ON notifications(userId, createdAt);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    ownerId TEXT NOT NULL,
    isPublic BOOLEAN DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_workspaces_owner ON workspaces(ownerId);

CREATE TABLE IF NOT EXISTS user_visibility (
    userId TEXT PRIMARY KEY,
    mode TEXT DEFAULT 'normal',
    showInNetwork BOOLEAN DEFAULT 1,
    showInSearch BOOLEAN DEFAULT 1,
    allowDirectMessages BOOLEAN DEFAULT 1,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
