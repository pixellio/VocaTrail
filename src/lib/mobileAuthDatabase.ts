import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID, createHash } from 'crypto';
import { getPgPool, isPostgresConfigured } from './pgPool';

/**
 * Storage for the mobile app's login handoff (one-time auth codes) and
 * refresh tokens — own SQLite file, matching the existing per-domain
 * separation convention (see usersDatabase.ts / locationsDatabase.ts).
 *
 * This is deliberately the first genuinely revocable auth mechanism in the
 * project: the existing web session (session.ts) is a stateless signed
 * cookie with no server-side record at all, so it can't be revoked before
 * it naturally expires. Refresh tokens here are real rows that can be
 * deleted to lock a device out immediately (on next refresh attempt) — which
 * is exactly why this table in particular MUST be on real persistent storage
 * (Postgres via DATABASE_URL) in production: on ephemeral storage, a revoked
 * token could come back to life if a stale instance gets reused.
 *
 * Supports Postgres via DATABASE_URL (see pgPool.ts) alongside the original
 * SQLite path — every exported function is now async (was sync); callers
 * must await these.
 */

const DB_PATH = process.env.MOBILE_AUTH_SQLITE_PATH || './data/mobile_auth.db';

const AUTH_CODE_TTL_MS = 60 * 1000; // 60 seconds — single-use, exchanged immediately
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// SQLite (local dev default)
// ---------------------------------------------------------------------------

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
    CREATE TABLE IF NOT EXISTS mobile_auth_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS mobile_refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME
    )
  `);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_hash ON mobile_refresh_tokens(token_hash)`);

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
    CREATE TABLE IF NOT EXISTS mobile_auth_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_hash ON mobile_refresh_tokens(token_hash)`);
  pgSchemaReady = true;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Auth codes (one-time, ~60s, PKCE handoff)
// ---------------------------------------------------------------------------

export async function createAuthCode(userId: string, codeChallenge: string): Promise<string> {
  const code = randomUUID();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();

  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query(
      'INSERT INTO mobile_auth_codes (code, user_id, code_challenge, expires_at) VALUES ($1, $2, $3, $4)',
      [code, userId, codeChallenge, expiresAt]
    );
    return code;
  }

  getSqliteDb()
    .prepare('INSERT INTO mobile_auth_codes (code, user_id, code_challenge, expires_at) VALUES (?, ?, ?, ?)')
    .run(code, userId, codeChallenge, expiresAt);
  return code;
}

interface AuthCodeRow {
  code: string;
  user_id: string;
  code_challenge: string;
  expires_at: string;
}

// Single-use: consumes (deletes) the code as part of looking it up, so a
// replayed code always fails even if the request races.
export async function consumeAuthCode(code: string): Promise<{ userId: string; codeChallenge: string } | null> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const pool = getPgPool();
    const result = await pool.query('SELECT * FROM mobile_auth_codes WHERE code = $1', [code]);
    const row = result.rows[0] as AuthCodeRow | undefined;
    if (!row) return null;
    await pool.query('DELETE FROM mobile_auth_codes WHERE code = $1', [code]);
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    return { userId: row.user_id, codeChallenge: row.code_challenge };
  }

  const database = getSqliteDb();
  const row = database.prepare('SELECT * FROM mobile_auth_codes WHERE code = ?').get(code) as
    | AuthCodeRow
    | undefined;
  if (!row) return null;
  database.prepare('DELETE FROM mobile_auth_codes WHERE code = ?').run(code);
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { userId: row.user_id, codeChallenge: row.code_challenge };
}

// ---------------------------------------------------------------------------
// Refresh tokens (long-lived, revocable)
// ---------------------------------------------------------------------------

export async function createRefreshToken(userId: string): Promise<string> {
  const token = randomUUID() + randomUUID(); // opaque, not a JWT
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();

  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query(
      'INSERT INTO mobile_refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [id, userId, hashToken(token), expiresAt]
    );
    return token;
  }

  getSqliteDb()
    .prepare('INSERT INTO mobile_refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .run(id, userId, hashToken(token), expiresAt);
  return token;
}

interface RefreshTokenRow {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
}

// Only the hash is ever stored, so a leaked database dump alone doesn't hand
// out usable refresh tokens.
export async function findValidRefreshToken(token: string): Promise<{ userId: string } | null> {
  const hash = hashToken(token);

  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query('SELECT * FROM mobile_refresh_tokens WHERE token_hash = $1', [hash]);
    const row = result.rows[0] as RefreshTokenRow | undefined;
    if (!row) return null;
    if (row.revoked_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    return { userId: row.user_id };
  }

  const row = getSqliteDb().prepare('SELECT * FROM mobile_refresh_tokens WHERE token_hash = ?').get(hash) as
    | RefreshTokenRow
    | undefined;
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { userId: row.user_id };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const hash = hashToken(token);

  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query('UPDATE mobile_refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1', [
      hash,
    ]);
    return;
  }

  getSqliteDb()
    .prepare("UPDATE mobile_refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?")
    .run(hash);
}

// For a future "log out all devices" / lost-device control.
export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query(
      'UPDATE mobile_refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
    return;
  }

  getSqliteDb()
    .prepare("UPDATE mobile_refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL")
    .run(userId);
}
