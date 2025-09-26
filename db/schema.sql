-- Drop tables if they exist for a clean slate during development
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS community_archive_votes;
DROP TABLE IF EXISTS content_location;
DROP TABLE IF EXISTS content_lifecycle;
DROP TABLE IF EXISTS content;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

-- Core user and profile tables
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Internal unique ID (e.g., from an auth provider or UUID)
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE profiles (
    userId TEXT PRIMARY KEY NOT NULL,
    username TEXT UNIQUE NOT NULL, -- Public, user-chosen, changeable username
    displayName TEXT,
    bio TEXT,
    avatarKey TEXT, -- Key for the user's avatar in R2
    preferences TEXT, -- JSON blob for user preferences like theme, etc.
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Authentication and session management
CREATE TABLE auth_sessions (
    token TEXT PRIMARY KEY, -- The secure, random session token
    userId TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    userAgent TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_auth_sessions_userId ON auth_sessions(userId);

-- Content-related tables
CREATE TABLE content (
    id TEXT PRIMARY KEY, -- UUID for the content
    userId TEXT NOT NULL,
    title TEXT,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_content_userId ON content(userId);

CREATE TABLE content_location (
    contentId TEXT PRIMARY KEY NOT NULL,
    storageType TEXT NOT NULL DEFAULT 'R2', -- e.g., 'R2', 'IPFS'
    objectKey TEXT NOT NULL UNIQUE, -- The key for the object in R2
    contentType TEXT,
    fileSize INTEGER,
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE
);

CREATE TABLE content_lifecycle (
    contentId TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived', 'deleted'
    expiresAt TIMESTAMP, -- NULL if archived or permanent
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE
);
CREATE INDEX idx_content_lifecycle_expiresAt ON content_lifecycle(status, expiresAt);

-- Community and social features
CREATE TABLE community_archive_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contentId TEXT NOT NULL,
    userId TEXT NOT NULL,
    voteType TEXT NOT NULL DEFAULT 'archive', -- 'archive', 'keep'
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(contentId, userId),
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE connections (
    followerId TEXT NOT NULL,
    followingId TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (followerId, followingId),
    FOREIGN KEY (followerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followingId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_connections_followingId ON connections(followingId);

-- Bookmarks table
CREATE TABLE bookmarks (
    userId TEXT NOT NULL,
    contentId TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (userId, contentId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    recipientId TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    isRead BOOLEAN DEFAULT 0,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_recipientId_createdAt ON messages(recipientId, createdAt);

-- Notifications table
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'new_message', 'new_follower', 'content_vote'
    title TEXT NOT NULL,
    content TEXT,
    actionUrl TEXT, -- URL to navigate to when notification is clicked
    isRead BOOLEAN DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_userId_createdAt ON notifications(userId, createdAt);

-- Comments table
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    contentId TEXT NOT NULL,
    parentCommentId TEXT, -- For nested replies
    comment TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (parentCommentId) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_contentId ON comments(contentId);
CREATE INDEX idx_comments_parentCommentId ON comments(parentCommentId);
