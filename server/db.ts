import { createClient, Client } from '@libsql/client';
import dotenv from 'dotenv';

// Load local environment files
dotenv.config({ path: '.env.local' });
dotenv.config();

let client: Client | null = null;

export function getDbClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is missing.');
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

export async function initDatabase(): Promise<void> {
  const db = getDbClient();

  // Create activities table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      focus_seconds INTEGER NOT NULL,
      break_seconds INTEGER NOT NULL,
      movement_label TEXT NOT NULL,
      rep_goal INTEGER NOT NULL,
      reported_reps INTEGER NOT NULL,
      break_outcome TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activities_user ON activities (user_id);
  `);

  // Create settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  console.log('[Turso] Database schema verified and initialized.');
}
