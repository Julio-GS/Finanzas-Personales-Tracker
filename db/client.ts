import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type Database = NeonHttpDatabase<typeof schema>;

let cachedDb: Database | null = null;
let cachedUrl: string | null = null;

/**
 * Returns a configured Drizzle database instance connected via Neon HTTP.
 * Lazily validates DATABASE_URL and initializes on first call.
 */
export function getDb(databaseUrl?: string): Database {
  const url = (databaseUrl ?? process.env.DATABASE_URL)?.trim();

  if (!url) {
    throw new Error('DATABASE_URL environment variable is required and must not be empty');
  }

  if (cachedDb && cachedUrl === url) {
    return cachedDb;
  }

  const sql = neon(url);
  const client = drizzle(sql, { schema });

  if (!databaseUrl) {
    cachedDb = client;
    cachedUrl = url;
  }

  return client;
}
