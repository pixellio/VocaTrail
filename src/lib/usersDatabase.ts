import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Storage for Google-authenticated app users — own SQLite file, separate
 * from the cards db and the locations db, matching the existing per-domain
 * separation convention (see locationsDatabase.ts).
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

const DB_PATH = process.env.USERS_SQLITE_PATH || './data/users.db';

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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

  return db;
}

export function findUserByEmail(email: string): AppUser | null {
  const row = getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase()) as AppUser | undefined;
  return row ?? null;
}

/**
 * Creates the user on first sign-in, or promotes an existing user's role
 * (never demotes — a plain user who later signs in through the vendor path
 * becomes a vendor, but a vendor signing in through the regular path stays
 * a vendor).
 */
export function upsertUserOnLogin(email: string, name: string | undefined, roleIfNew: UserRole): AppUser {
  const normalizedEmail = email.toLowerCase();
  const existing = findUserByEmail(normalizedEmail);

  if (!existing) {
    const id = randomUUID();
    getDb()
      .prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(id, normalizedEmail, name ?? null, roleIfNew);
    return findUserByEmail(normalizedEmail)!;
  }

  if (roleIfNew === 'vendor' && existing.role !== 'vendor') {
    setUserRole(existing.id, 'vendor');
  }
  return findUserByEmail(normalizedEmail)!;
}

export function setUserRole(id: string, role: UserRole): void {
  getDb().prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, id);
}

export function listUsers(): AppUser[] {
  return getDb().prepare('SELECT * FROM users ORDER BY created_at DESC').all() as AppUser[];
}
