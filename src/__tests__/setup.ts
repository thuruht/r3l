import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { migrations } from './migration-data';

export async function applyAllMigrations() {
  await applyD1Migrations(env.DB, migrations);
}
