# Master Migration Tracking Document

This document tracks the database schema evolution for Rel F (Relational Ephemeral Filenet).

## Current Status

| Migration ID | Name | Description | Status |
| :--- | :--- | :--- | :--- |
| 0001 | `init` | Creates `users` table with auth fields. | ✅ Applied |
| 0002 | `create_relationship_tables` | Creates `relationships` (sym/asym) and `mutual_connections`. | ✅ Applied |
| 0003 | `create_communiques` | Creates `communiques` table for user profiles and themes. | ✅ Applied |
| 0004 | `create_files` | Creates `files` table for R2 metadata and ephemeral logic. | ✅ Applied |
| 0005 | `create_notifications` | Creates `notifications` table for the inbox system. | ✅ Applied |
| 0006 | `add_email_to_users` | Adds email column for verification. | ✅ Applied |
| 0007 | `add_vitality_to_files` | Adds vitality column for file boosting. | ✅ Applied |
| 0008 | `fix_relationship_constraints` | Fixes unique constraints on relationships. | ✅ Applied |
| 0009 | `add_user_customization_fields` | Adds theme preferences and profile aesthetics to users. | ✅ Applied |
| 0010 | `create_collections` | Creates `collections` and `collection_files` tables. | ✅ Applied |
| 0011 | `create_messages` | Creates `messages` table for direct messaging. | ✅ Applied |
| 0012 | `add_encryption_and_archive_to_messages` | Adds `is_encrypted`, `iv` to `messages` and `files`. | ✅ Applied |

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
    - `is_encrypted` (BOOLEAN): If 1, content is AES-GCM encrypted.
    - `iv` (TEXT): Initialization vector for encryption.

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

### 0010_create_collections.sql
Curated sets of files.
- **collections**: `id`, `user_id`, `name`, `description`, `visibility`.
- **collection_files**: `collection_id`, `file_id`, `file_order`.

### 0011_create_messages.sql & 0012
Direct messaging system.
- **messages**: `id`, `sender_id`, `receiver_id`, `content`, `is_read`, `created_at`, `is_archived`, `is_encrypted`, `iv`.
