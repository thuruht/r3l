# Database Setup Guide

This guide explains how to set up and initialize the database for the R3L:F application.

## Database Schema

R3L:F uses Cloudflare D1 as its database. The schema consists of the following core tables:

- **users**: Stores user accounts with username-based authentication and recovery keys
- **auth_sessions**: Tracks active login sessions
- **content**: Stores user-generated content
- **content_location**: Maps content to geographic coordinates
- **drawers**: User's content collections
- **content_associations**: Links content to drawers
- ...and several other supporting tables

## Initial Setup

When deploying R3L:F for the first time, you need to initialize the database schema.

### Create the Database

If you haven't already created the D1 database:

```bash
npx wrangler d1 create r3l-db
```

Then update your `wrangler.jsonc` with the database binding:

```json
{
  "d1_databases": [
    {
      "binding": "R3L_DB",
      "database_name": "r3l-db",
      "database_id": "YOUR_DATABASE_ID"
    }
  ]
}
```

### Apply Migrations

To initialize the database schema:

```bash
cd migrations
chmod +x apply-migrations.sh
./apply-migrations.sh --remote r3l-db
```

### Local Development

For local development, use the `--local` flag:

```bash
./apply-migrations.sh --local r3l-db
```

## Migration Scripts

The `migrations` directory contains several utility scripts:

- **apply-migrations.sh**: Applies all migrations to create tables
- **check-and-apply-migrations.sh**: Checks which migrations need to be applied
- **update-content-schema.sh**: Updates the content table schema for legacy databases

## Troubleshooting

### No Such Table Error

If you see errors like `no such table: users`, it means the database has not been initialized:

```bash
cd migrations
chmod +x apply-migrations.sh
./apply-migrations.sh --remote r3l-db
```

### Database Authentication Error

If you see authentication errors, ensure your wrangler.toml has the correct database ID and that you're logged in with `wrangler login`.

### Schema Mismatch

For existing databases with schema differences, run:

```bash
cd migrations
chmod +x update-content-schema.sh
./update-content-schema.sh
```

This script will check for and add missing columns in both the `content` and `users` tables.

### Schema Updates

If migrating from an older version, you may need to update the schema to use username-based authentication:

```bash
npx wrangler d1 execute r3l-db --file=./db/schema.sql
```

## Inspecting the Database

You can inspect the database using D1 SQL commands:

```bash
npx wrangler d1 execute r3l-db --remote --command "SELECT * FROM users LIMIT 10"
```

For more information, refer to the [Cloudflare D1 documentation](https://developers.cloudflare.com/workers/learning/using-durable-objects).
