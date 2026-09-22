import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { getPgPool, isPostgresConfigured } from './pgPool';

/**
 * Storage for Google-authenticated app users — own SQLite file, separate
 * from the cards db and the locations db, matching the existing per-domain
 * separation convention (see locationsDatabase.ts).
 *
 * Supports Postgres via DATABASE_URL (see pgPool.ts) alongside the original
 * SQLite path — every exported function is now async (was sync); callers
 * must await these.
 */

export type UserRole = 'user' | 'vendor';

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// SQLite (local dev default)
// ---------------------------------------------------------------------------

const DB_PATH = process.env.USERS_SQLITE_PATH || './data/users.db';

let sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (sqliteDb) return sqliteDb;

  if (DB_PATH !== ':memory:') {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  sqliteDb = new Database(DB_PATH);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

  return sqliteDb;
}

// ---------------------------------------------------------------------------
// Postgres (production, via DATABASE_URL)
// ---------------------------------------------------------------------------

let pgSchemaReady = false;

async function ensurePgSchema(): Promise<void> {
  if (pgSchemaReady) return;
  const pool = getPgPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  pgSchemaReady = true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const normalizedEmail = email.toLowerCase();

  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    return (result.rows[0] as AppUser) ?? null;
  }

  const row = getSqliteDb().prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as
    | AppUser
    | undefined;
  return row ?? null;
}

/**
 * Creates the user on first sign-in, or promotes an existing user's role
 * (never demotes — a plain user who later signs in through the vendor path
 * becomes a vendor, but a vendor signing in through the regular path stays
 * a vendor).
 */
export async function upsertUserOnLogin(
  email: string,
  name: string | undefined,
  roleIfNew: UserRole
): Promise<AppUser> {
  const normalizedEmail = email.toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);

  if (!existing) {
    const id = randomUUID();
    if (isPostgresConfigured()) {
      await ensurePgSchema();
      await getPgPool().query('INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4)', [
        id,
        normalizedEmail,
        name ?? null,
        roleIfNew,
      ]);
    } else {
      getSqliteDb()
        .prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
        .run(id, normalizedEmail, name ?? null, roleIfNew);
    }
    return (await findUserByEmail(normalizedEmail))!;
  }

  if (roleIfNew === 'vendor' && existing.role !== 'vendor') {
    await setUserRole(existing.id, 'vendor');
  }
  return (await findUserByEmail(normalizedEmail))!;
}

export async function setUserRole(id: string, role: UserRole): Promise<void> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      role,
      id,
    ]);
    return;
  }

  getSqliteDb().prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, id);
}

export async function listUsers(): Promise<AppUser[]> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows as AppUser[];
  }

  return getSqliteDb().prepare('SELECT * FROM users ORDER BY created_at DESC').all() as AppUser[];
}
