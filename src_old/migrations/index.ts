/**
 * Database migration system for R3L:F
 *
 * Manages database schema changes programmatically
 */

import { Env } from '../types/env.js';
import { Logger, LogLevel } from '../utils/logger.js';

/**
 * Migration interface
 */
interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
}

/**
 * Migration runner class
 */
export class MigrationRunner {
  private logger: Logger;

  /**
   * List of all migrations
   */
  private migrations: Migration[] = [
    // Migration: Add performance indexes
    {
      id: '001_add_indexes',
      name: 'Add performance indexes',
      up: `
        CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
        CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
        CREATE INDEX IF NOT EXISTS idx_content_visibility ON content(visibility);
        CREATE INDEX IF NOT EXISTS idx_geo_points_user_id ON geo_points(user_id);
        CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(user_id, connected_user_id);
        CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
      `,
      down: `
        DROP INDEX IF EXISTS idx_content_user_id;
        DROP INDEX IF EXISTS idx_content_created_at;
        DROP INDEX IF EXISTS idx_content_visibility;
        DROP INDEX IF EXISTS idx_geo_points_user_id;
        DROP INDEX IF EXISTS idx_connections_users;
        DROP INDEX IF EXISTS idx_connections_status;
        DROP INDEX IF EXISTS idx_messages_conversation;
        DROP INDEX IF EXISTS idx_notifications_user_read;
      `,
    },
    // Migration: Add missing fields
    {
      id: '002_add_missing_fields',
      name: 'Add missing fields to tables',
      up: `
        -- Add expires_at to content table
        ALTER TABLE content ADD COLUMN IF NOT EXISTS expires_at INTEGER;
        
        -- Add ephemeral flag to content
        ALTER TABLE content ADD COLUMN IF NOT EXISTS is_ephemeral BOOLEAN DEFAULT 0;
        
        -- Add archive reason to content
        ALTER TABLE content ADD COLUMN IF NOT EXISTS archived_reason TEXT;
        
        -- Add view_count to content
        ALTER TABLE content ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
        
        -- Add last_activity to users
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity INTEGER;
        
        -- Add lurker_mode to users
        ALTER TABLE users ADD COLUMN IF NOT EXISTS lurker_mode BOOLEAN DEFAULT 0;
      `,
      down: `
        -- This is dangerous to run in production, but provided for completeness
        -- These statements may fail if data exists in the columns
        ALTER TABLE content DROP COLUMN IF EXISTS expires_at;
        ALTER TABLE content DROP COLUMN IF EXISTS is_ephemeral;
        ALTER TABLE content DROP COLUMN IF EXISTS archived_reason;
        ALTER TABLE content DROP COLUMN IF EXISTS view_count;
        ALTER TABLE users DROP COLUMN IF EXISTS last_activity;
        ALTER TABLE users DROP COLUMN IF EXISTS lurker_mode;
      `,
    },
    // Migration: Create archive_votes table
    {
      id: '003_create_archive_votes',
      name: 'Create archive votes table',
      up: `
        CREATE TABLE IF NOT EXISTS archive_votes (
          id TEXT PRIMARY KEY,
          content_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          voted_at INTEGER NOT NULL,
          FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_archive_votes_content ON archive_votes(content_id);
        CREATE INDEX IF NOT EXISTS idx_archive_votes_user ON archive_votes(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_archive_votes_unique ON archive_votes(content_id, user_id);
      `,
      down: `
        DROP TABLE IF EXISTS archive_votes;
      `,
    },
  ];

  /**
   * Create a new migration runner
   */
  constructor() {
    this.logger = new Logger('MigrationRunner');
  }

  /**
   * Run migrations
   *
   * @param env Environment object
   * @param direction Migration direction (up or down)
   * @returns Successful migration count
   */
  async run(env: Env, direction: 'up' | 'down' = 'up'): Promise<number> {
    this.logger.info(`Running migrations in ${direction} direction`);

    // Create migrations table if it doesn't exist
    await env.R3L_DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `
    ).run();

    let successCount = 0;

    // Run migrations in the proper order
    const migrationsToRun = direction === 'up' ? this.migrations : [...this.migrations].reverse();

    for (const migration of migrationsToRun) {
      try {
        const applied = await env.R3L_DB.prepare('SELECT id FROM migrations WHERE id = ?')
          .bind(migration.id)
          .first();

        if (direction === 'up' && !applied) {
          // Apply migration
          await env.R3L_DB.prepare(migration.up).run();

          // Record migration
          await env.R3L_DB.prepare('INSERT INTO migrations (id, applied_at) VALUES (?, ?)')
            .bind(migration.id, Date.now())
            .run();

          this.logger.info(`Applied migration: ${migration.name}`);
          successCount++;
        } else if (direction === 'down' && applied) {
          // Roll back migration
          await env.R3L_DB.prepare(migration.down).run();

          // Remove migration record
          await env.R3L_DB.prepare('DELETE FROM migrations WHERE id = ?').bind(migration.id).run();

          this.logger.info(`Rolled back migration: ${migration.name}`);
          successCount++;
        } else {
          this.logger.debug(
            `Skipping migration: ${migration.name} (already ${direction === 'up' ? 'applied' : 'rolled back'})`
          );
        }
      } catch (error) {
        this.logger.error(
          `Error running migration ${migration.id}: ${migration.name}`,
          error as Error
        );
        throw error; // Re-throw to abort the migration process
      }
    }

    this.logger.info(`Successfully ran ${successCount} migrations`);
    return successCount;
  }

  /**
   * Get migration status
   *
   * @param env Environment object
   * @returns Migration status
   */
  async getStatus(env: Env): Promise<
    {
      id: string;
      name: string;
      applied: boolean;
      appliedAt?: number;
    }[]
  > {
    // Create migrations table if it doesn't exist
    await env.R3L_DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `
    ).run();

    // Get applied migrations
    const appliedMigrations = await env.R3L_DB.prepare(
      'SELECT id, applied_at FROM migrations'
    ).all();

    const appliedMap = new Map<string, number>();

    for (const row of appliedMigrations.results || []) {
      appliedMap.set(String(row.id), Number(row.applied_at));
    }

    // Return status of all migrations
    return this.migrations.map(migration => ({
      id: migration.id,
      name: migration.name,
      applied: appliedMap.has(migration.id),
      appliedAt: appliedMap.get(migration.id),
    }));
  }
}
