#!/usr/bin/env node
/**
 * Creates (or resets the password of) an email+password user for the mobile
 * app's password login (e.g. a Google Play reviewer account).
 *
 * Usage: node scripts/create-password-user.js <email> <password> [name]
 *
 * Targets Postgres when DATABASE_URL is set (load it from .env first, e.g.
 * `node --env-file=.env scripts/create-password-user.js ...`), otherwise the
 * local SQLite file (USERS_SQLITE_PATH or ./data/users.db). Idempotent.
 * hashPassword() duplicates src/lib/passwordHash.ts — keep in sync.
 */
const { randomBytes, randomUUID, scrypt } = require('crypto');

function hashPassword(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) =>
      err ? reject(err) : resolve(`scrypt$16384$8$1$${salt.toString('hex')}$${key.toString('hex')}`)
    );
  });
}

async function main() {
  const [emailArg, password, name] = process.argv.slice(2);
  if (!emailArg || !password) {
    console.error('Usage: node scripts/create-password-user.js <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Password must be at least 10 characters.');
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  const hash = await hashPassword(password);
  const displayName = name || null;

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
      await pool.query(`CREATE TABLE IF NOT EXISTS user_credentials (
        user_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
      const r = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      let id = r.rows[0] && r.rows[0].id;
      if (!id) {
        id = randomUUID();
        await pool.query('INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4)', [id, email, displayName, 'user']);
      }
      await pool.query(
        `INSERT INTO user_credentials (user_id, password_hash) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = CURRENT_TIMESTAMP`,
        [id, hash]
      );
      console.log(`Postgres: password user ready for ${email}`);
    } finally {
      await pool.end();
    }
    return;
  }

  const Database = require('better-sqlite3');
  const fs = require('fs');
  const path = require('path');
  const dbPath = process.env.USERS_SQLITE_PATH || './data/users.db';
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.exec(`CREATE TABLE IF NOT EXISTS user_credentials (
    user_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const id = existing ? existing.id : randomUUID();
  if (!existing) {
    db.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)').run(id, email, displayName, 'user');
  }
  db.prepare(
    `INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = datetime('now')`
  ).run(id, hash);
  console.log(`SQLite (${dbPath}): password user ready for ${email}`);
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
