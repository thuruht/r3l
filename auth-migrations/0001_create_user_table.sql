-- Migration number: 0001        2025-07-23T00:00:00.000Z
CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    github_id TEXT UNIQUE,
    orcid_id TEXT UNIQUE,
    avatar_key TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
