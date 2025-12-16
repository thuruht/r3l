# Master Migration Tracking Document

This document tracks the database schema evolution for Rel F (Relational Ephemeral Filenet).

## Current Status

| Migration ID | Name | Description | Status |
| :--- | :--- | :--- | :--- |
| 0001 | `init` | Creates `users` table with auth fields. | ✅ Applied |
| 0002 | `create_relationship_tables` | Creates `relationships` (sym/asym) and `mutual_connections`. | ✅ Applied |
| 0003 | `create_communiques` | Creates `communiques` table for user profiles and themes. | ⏳ Pending Application (Auth Error) |
| 0004 | `create_files` | Creates `files` table for R2 metadata and ephemeral logic. | ⏳ Pending Application (Auth Error) |
| 0005 | `create_notifications` | Creates `notifications` table for the inbox system. | ⏳ Pending Application (Auth Error) |

---

## Schema Details

### 0001_init.sql
- **users**: `id`, `username`, `password` (hashed), `salt`, `avatar_url`, `created_at`.

### 0002_create_relationship_tables.sql
- **relationships**: Directed edges. `source_user_id`, `target_user_id`, `type` ('asym_follow', 'sym_request', 'sym_accepted'), `status`.
- **mutual_connections**: Undirected edges (optimization). `user_a_id`, `user_b_id` (where a < b).
- **user_visibility_preferences**: The "3rd space" hide list.

### 0003_create_communiques.sql
Stores the persistent "profile" text and styling preferences for a user.
- **communiques**
    - `user_id` (INTEGER PRIMARY KEY, FK -> users.id)
    - `content` (TEXT): The main text body of the communique.
    - `theme_prefs` (TEXT/JSON): Custom colors or style flags (e.g., `{ "mist_density": 0.5 }`).
    - `updated_at` (DATETIME)

### 0004_create_files.sql
Metadata for files stored in R2. Handles the ephemeral lifecycle.
- **files**
    - `id` (INTEGER PRIMARY KEY)
    - `user_id` (INTEGER, FK -> users.id)
    - `r2_key` (TEXT UNIQUE): The object key in R2.
    - `filename` (TEXT): Original display name.
    - `size` (INTEGER): Bytes.
    - `mime_type` (TEXT)
    - `visibility` (TEXT): 'public', 'sym', 'me'.
    - `is_archived` (BOOLEAN): If 1, file does not expire.
    - `expires_at` (DATETIME): Calculated at upload (e.g., +1 week).
    - `created_at` (DATETIME)

### 0005_create_notifications.sql
The persistent backing store for the User Inbox.
- **notifications**
    - `id` (INTEGER PRIMARY KEY)
    - `user_id` (INTEGER, FK -> users.id): The recipient.
    - `actor_id` (INTEGER, FK -> users.id, Nullable): The user who triggered the event.
    - `type` (TEXT): 'sym_request', 'sym_accepted', 'file_shared', 'system_alert'.
    - `payload` (TEXT/JSON): Extra data (e.g., `{ "file_id": 123 }`).
    - `is_read` (BOOLEAN DEFAULT 0)
    - `created_at` (DATETIME)

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);