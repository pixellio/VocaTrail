import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Storage for vendor/location registrations — deliberately a separate SQLite
 * file from the cards database (src/lib/database.ts) per product decision:
 * location data must never be mixed with the existing user/cards store.
 */

export interface LocationSummary {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  has_logo: boolean;
  created_at: string;
}

export interface LocationPublic {
  id: string;
  name: string;
  instructions: string;
}

export interface LocationLogo {
  data: Buffer;
  mime: string;
}

export interface NewLocationInput {
  name: string;
  instructions: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  logo?: { data: Buffer; mime: string } | null;
}

const DB_PATH = process.env.LOCATIONS_SQLITE_PATH || './data/locations.db';

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
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      logo BLOB,
      logo_mime TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at)`);

  return db;
}

export function createLocation(input: NewLocationInput): { id: string } {
  const id = randomUUID();
  const stmt = getDb().prepare(`
    INSERT INTO locations (id, name, instructions, contact_name, contact_email, contact_phone, logo, logo_mime)
    VALUES (@id, @name, @instructions, @contact_name, @contact_email, @contact_phone, @logo, @logo_mime)
  `);

  stmt.run({
    id,
    name: input.name,
    instructions: input.instructions,
    contact_name: input.contact_name ?? null,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    logo: input.logo?.data ?? null,
    logo_mime: input.logo?.mime ?? null,
  });

  return { id };
}

export function getAllLocations(): LocationSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, contact_name, contact_email, contact_phone,
              (logo IS NOT NULL) AS has_logo, created_at
       FROM locations ORDER BY created_at DESC`
    )
    .all() as Array<Omit<LocationSummary, 'has_logo'> & { has_logo: number }>;

  return rows.map((row) => ({ ...row, has_logo: Boolean(row.has_logo) }));
}

export function getLocationById(id: string): LocationPublic | null {
  const row = getDb()
    .prepare(`SELECT id, name, instructions FROM locations WHERE id = ?`)
    .get(id) as LocationPublic | undefined;
  return row ?? null;
}

export function getLocationLogo(id: string): LocationLogo | null {
  const row = getDb()
    .prepare(`SELECT logo, logo_mime FROM locations WHERE id = ? AND logo IS NOT NULL`)
    .get(id) as { logo: Buffer; logo_mime: string } | undefined;
  if (!row) return null;
  return { data: row.logo, mime: row.logo_mime };
}
