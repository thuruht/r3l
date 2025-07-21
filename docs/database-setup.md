# D1 Database Initialization

R3L:F uses Cloudflare D1 for its database needs. Before the application can function properly, you need to initialize the database by applying the migrations.

## Error: "no such table: users"

If you're seeing errors like `D1_ERROR: no such table: users: SQLITE_ERROR` during the OAuth authentication process, it means the database tables haven't been created yet.

## How to Fix

Run the following command to apply all migrations to your remote database:

```bash
# From the project root directory
cd migrations
chmod +x apply-migrations.sh
./apply-migrations.sh --remote YOUR_DATABASE_NAME
```

Replace `YOUR_DATABASE_NAME` with the name of your D1 database (as configured in wrangler.jsonc).

## Manual Application

Alternatively, you can run the migrations manually:

```bash
npx wrangler d1 migrations apply YOUR_DATABASE_NAME --remote
```

## Database Schema

The migrations will create the following tables:

1. `users` - Stores user information, including OAuth identifiers
2. `auth_sessions` - Manages authentication sessions
3. `content` - Stores primary content
4. `drawers` - Organizes content in collections
5. `content_associations` - Relates content to other content
6. `ephemeral_content` - Handles temporary content
7. `content_sharing` - Manages content sharing permissions
8. `archive_voting` - Handles voting on content archival
9. `tag_management` - Manages content tagging

## Local Development

For local development, use:

```bash
./apply-migrations.sh --local YOUR_DATABASE_NAME
```

This will apply the migrations to your local development database.
