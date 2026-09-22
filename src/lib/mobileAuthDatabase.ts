import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID, createHash } from 'crypto';

/**
 * Storage for the mobile app's login handoff (one-time auth codes) and
 * refresh tokens — own SQLite file, matching the existing per-domain
 * separation convention (see usersDatabase.ts / locationsDatabase.ts).
 *
 * This is deliberately the first genuinely revocable auth mechanism in the
 * project: the existing web session (session.ts) is a stateless signed
 * cookie with no server-side record at all, so it can't be revoked before
 * it naturally expires. Refresh tokens here are real rows that can be
 * deleted to lock a device out immediately (on next refresh attempt).
 */

const DB_PATH = process.env.MOBILE_AUTH_SQLITE_PATH || './data/mobile_auth.db';

const AUTH_CODE_TTL_MS = 60 * 1000; // 60 seconds — single-use, exchanged immediately
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  if (DB_PATH !== ':memory:') {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS mobile_auth_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS mobile_refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_hash ON mobile_refresh_tokens(token_hash)`);

  return db;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// --- Auth codes (one-time, ~60s, PKCE handoff) ---

export function createAuthCode(userId: string, codeChallenge: string): string {
  const code = randomUUID();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();
  getDb()
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
export function consumeAuthCode(code: string): { userId: string; codeChallenge: string } | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM mobile_auth_codes WHERE code = ?').get(code) as
    | AuthCodeRow
    | undefined;
  if (!row) return null;
  database.prepare('DELETE FROM mobile_auth_codes WHERE code = ?').run(code);
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { userId: row.user_id, codeChallenge: row.code_challenge };
}

// --- Refresh tokens (long-lived, revocable) ---

export function createRefreshToken(userId: string): string {
  const token = randomUUID() + randomUUID(); // opaque, not a JWT
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  getDb()
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
export function findValidRefreshToken(token: string): { userId: string } | null {
  const row = getDb()
    .prepare('SELECT * FROM mobile_refresh_tokens WHERE token_hash = ?')
    .get(hashToken(token)) as RefreshTokenRow | undefined;
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { userId: row.user_id };
}

export function revokeRefreshToken(token: string): void {
  getDb()
    .prepare("UPDATE mobile_refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?")
    .run(hashToken(token));
}

// For a future "log out all devices" / lost-device control.
export function revokeAllRefreshTokensForUser(userId: string): void {
  getDb()
    .prepare("UPDATE mobile_refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL")
    .run(userId);
}
