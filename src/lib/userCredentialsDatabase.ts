import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { getPgPool, isPostgresConfigured } from './pgPool';

/**
 * Optional email + password credentials, used by the mobile app's
 * /api/auth/mobile/password-login (Google Play reviewer / non-Google
 * accounts). Kept in its own table, NOT as a column on `users`, so password
 * hashes can never leak through the many `SELECT * FROM users` paths
 * (e.g. /api/admin/users). Lives in the users database (same SQLite file /
 * same DATABASE_URL). Accounts are created only via
 * scripts/create-password-user.js — there is no public sign-up.
 */

const DB_PATH = process.env.USERS_SQLITE_PATH || './data/users.db';

let sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (sqliteDb) return sqliteDb;
  if (DB_PATH !== ':memory:') {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }
  sqliteDb = new Database(DB_PATH);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      user_id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return sqliteDb;
}

let pgSchemaReady = false;

async function ensurePgSchema(): Promise<void> {
  if (pgSchemaReady) return;
  await getPgPool().query(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      user_id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  pgSchemaReady = true;
}

export async function getPasswordHash(userId: string): Promise<string | null> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query('SELECT password_hash FROM user_credentials WHERE user_id = $1', [userId]);
    return (result.rows[0]?.password_hash as string | undefined) ?? null;
  }
  const row = getSqliteDb().prepare('SELECT password_hash FROM user_credentials WHERE user_id = ?').get(userId) as
    | { password_hash: string }
    | undefined;
  return row?.password_hash ?? null;
}

export async function setPasswordHash(userId: string, passwordHash: string): Promise<void> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query(
      `INSERT INTO user_credentials (user_id, password_hash) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = CURRENT_TIMESTAMP`,
      [userId, passwordHash]
    );
    return;
  }
  getSqliteDb()
    .prepare(
      `INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = datetime('now')`
    )
    .run(userId, passwordHash);
}
