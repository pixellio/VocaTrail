import { Pool } from 'pg';

/**
 * Shared Postgres connection pool, reused by every database module that
 * supports Postgres (database.ts/cards, locationsDatabase.ts, usersDatabase.ts,
 * mobileAuthDatabase.ts). Every call goes through pool.query(...), which
 * checks out and releases a connection per call — the correct pattern under
 * concurrent serverless requests, unlike holding one long-lived client for a
 * module's whole lifetime (what the old, unused cards Postgres adapter did).
 */

let pool: Pool | null = null;

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

export function getPgPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }
  pool = new Pool({ connectionString });
  return pool;
}
