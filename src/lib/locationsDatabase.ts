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

export type FaqGenerationStatus = 'ok' | 'failed' | 'pending';

export interface LocationFaqQuestion {
  text: string;
  // The multi-word compound noun this question is centrally about (e.g. "dog
  // walker"), if any — lets the mobile app treat it as one card instead of
  // splitting it into disconnected single words. Null for questions with no
  // real compound. See faqGenerationService.ts's SYSTEM_PROMPT.
  keyPhrase: string | null;
}

export interface LocationFaqs {
  locationId: string;
  faqs: LocationFaqQuestion[];
  generatedAt: string;
  status: FaqGenerationStatus;
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_faqs (
      location_id TEXT PRIMARY KEY REFERENCES locations(id),
      faqs_json TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      generation_status TEXT NOT NULL DEFAULT 'pending'
    )
  `);

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

export interface LocationDetail extends LocationSummary {
  instructions: string;
}

// Full record (minus the raw logo blob) for the vendor edit form — LocationPublic
// intentionally omits contact info since it's used for the public QR-scan lookup.
export function getLocationDetail(id: string): LocationDetail | null {
  const row = getDb()
    .prepare(
      `SELECT id, name, instructions, contact_name, contact_email, contact_phone,
              (logo IS NOT NULL) AS has_logo, created_at
       FROM locations WHERE id = ?`
    )
    .get(id) as (Omit<LocationDetail, 'has_logo'> & { has_logo: number }) | undefined;
  if (!row) return null;
  return { ...row, has_logo: Boolean(row.has_logo) };
}

export interface LocationUpdateInput {
  name: string;
  instructions: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  logo?: { data: Buffer; mime: string } | null;
  clearLogo?: boolean;
}

// Returns whether the instructions text actually changed, so callers can
// decide whether stored FAQs are now stale and need regenerating.
export function updateLocation(id: string, input: LocationUpdateInput): { found: boolean; instructionsChanged: boolean } {
  const existing = getDb().prepare(`SELECT instructions FROM locations WHERE id = ?`).get(id) as
    | { instructions: string }
    | undefined;
  if (!existing) return { found: false, instructionsChanged: false };

  const setLogo = input.logo !== undefined && input.logo !== null;
  const clearLogo = Boolean(input.clearLogo);

  getDb()
    .prepare(
      `UPDATE locations SET
         name = @name,
         instructions = @instructions,
         contact_name = @contact_name,
         contact_email = @contact_email,
         contact_phone = @contact_phone,
         ${setLogo ? 'logo = @logo, logo_mime = @logo_mime,' : ''}
         ${clearLogo && !setLogo ? 'logo = NULL, logo_mime = NULL,' : ''}
         updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`
    )
    .run({
      id,
      name: input.name,
      instructions: input.instructions,
      contact_name: input.contact_name ?? null,
      contact_email: input.contact_email ?? null,
      contact_phone: input.contact_phone ?? null,
      ...(setLogo ? { logo: input.logo!.data, logo_mime: input.logo!.mime } : {}),
    });

  return { found: true, instructionsChanged: existing.instructions !== input.instructions };
}

export function deleteLocation(id: string): boolean {
  const result = getDb().prepare(`DELETE FROM locations WHERE id = ?`).run(id);
  getDb().prepare(`DELETE FROM location_faqs WHERE location_id = ?`).run(id);
  return result.changes > 0;
}

export function getLocationLogo(id: string): LocationLogo | null {
  const row = getDb()
    .prepare(`SELECT logo, logo_mime FROM locations WHERE id = ? AND logo IS NOT NULL`)
    .get(id) as { logo: Buffer; logo_mime: string } | undefined;
  if (!row) return null;
  return { data: row.logo, mime: row.logo_mime };
}

export function saveLocationFaqs(
  locationId: string,
  faqs: LocationFaqQuestion[],
  status: FaqGenerationStatus
): void {
  getDb()
    .prepare(
      `INSERT INTO location_faqs (location_id, faqs_json, generated_at, generation_status)
       VALUES (@location_id, @faqs_json, CURRENT_TIMESTAMP, @generation_status)
       ON CONFLICT(location_id) DO UPDATE SET
         faqs_json = excluded.faqs_json,
         generated_at = excluded.generated_at,
         generation_status = excluded.generation_status`
    )
    .run({
      location_id: locationId,
      faqs_json: JSON.stringify(faqs),
      generation_status: status,
    });
}

export function getLocationFaqs(id: string): LocationFaqs | null {
  const row = getDb()
    .prepare(
      `SELECT location_id, faqs_json, generated_at, generation_status FROM location_faqs WHERE location_id = ?`
    )
    .get(id) as
    | { location_id: string; faqs_json: string; generated_at: string; generation_status: FaqGenerationStatus }
    | undefined;
  if (!row) return null;
  const parsed = JSON.parse(row.faqs_json) as unknown[];
  // Backward compatible with rows saved before keyPhrase existed (plain
  // string[]) — wrap them into the current shape with no keyPhrase, rather
  // than breaking on old cached locations.
  const faqs: LocationFaqQuestion[] = parsed.map((item) =>
    typeof item === 'string' ? { text: item, keyPhrase: null } : (item as LocationFaqQuestion)
  );
  return {
    locationId: row.location_id,
    faqs,
    generatedAt: row.generated_at,
    status: row.generation_status,
  };
}
