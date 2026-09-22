import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { getPgPool, isPostgresConfigured } from './pgPool';

/**
 * Storage for vendor/location registrations — deliberately a separate SQLite
 * file from the cards database (src/lib/database.ts) per product decision:
 * location data must never be mixed with the existing user/cards store.
 *
 * Supports Postgres via DATABASE_URL (see pgPool.ts) alongside the original
 * SQLite path — SQLite stays the local-dev default (fast, zero setup), and
 * every exported function is async (a change from the original sync API)
 * since a real dual-backend can't be both sync and async under one signature.
 * Callers must now await these.
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

// ---------------------------------------------------------------------------
// SQLite (local dev default)
// ---------------------------------------------------------------------------

const DB_PATH = process.env.LOCATIONS_SQLITE_PATH || './data/locations.db';

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
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at)`);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS location_faqs (
      location_id TEXT PRIMARY KEY REFERENCES locations(id),
      faqs_json TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      generation_status TEXT NOT NULL DEFAULT 'pending'
    )
  `);

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
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      logo BYTEA,
      logo_mime TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS location_faqs (
      location_id TEXT PRIMARY KEY REFERENCES locations(id),
      faqs_json TEXT NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      generation_status TEXT NOT NULL DEFAULT 'pending'
    )
  `);
  pgSchemaReady = true;
}

// ---------------------------------------------------------------------------
// Public API — each function branches on backend, SQLite path unchanged
// ---------------------------------------------------------------------------

export async function createLocation(input: NewLocationInput): Promise<{ id: string }> {
  const id = randomUUID();

  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query(
      `INSERT INTO locations (id, name, instructions, contact_name, contact_email, contact_phone, logo, logo_mime)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        input.name,
        input.instructions,
        input.contact_name ?? null,
        input.contact_email ?? null,
        input.contact_phone ?? null,
        input.logo?.data ?? null,
        input.logo?.mime ?? null,
      ]
    );
    return { id };
  }

  const stmt = getSqliteDb().prepare(`
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

export async function getAllLocations(): Promise<LocationSummary[]> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query(
      `SELECT id, name, contact_name, contact_email, contact_phone,
              (logo IS NOT NULL) AS has_logo, created_at
       FROM locations ORDER BY created_at DESC`
    );
    return result.rows as LocationSummary[]; // pg returns real booleans for IS NOT NULL, no cast needed
  }

  const rows = getSqliteDb()
    .prepare(
      `SELECT id, name, contact_name, contact_email, contact_phone,
              (logo IS NOT NULL) AS has_logo, created_at
       FROM locations ORDER BY created_at DESC`
    )
    .all() as Array<Omit<LocationSummary, 'has_logo'> & { has_logo: number }>;

  return rows.map((row) => ({ ...row, has_logo: Boolean(row.has_logo) }));
}

export async function getLocationById(id: string): Promise<LocationPublic | null> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query(`SELECT id, name, instructions FROM locations WHERE id = $1`, [id]);
    return (result.rows[0] as LocationPublic) ?? null;
  }

  const row = getSqliteDb()
    .prepare(`SELECT id, name, instructions FROM locations WHERE id = ?`)
    .get(id) as LocationPublic | undefined;
  return row ?? null;
}

export interface LocationDetail extends LocationSummary {
  instructions: string;
}

// Full record (minus the raw logo blob) for the vendor edit form — LocationPublic
// intentionally omits contact info since it's used for the public QR-scan lookup.
export async function getLocationDetail(id: string): Promise<LocationDetail | null> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query(
      `SELECT id, name, instructions, contact_name, contact_email, contact_phone,
              (logo IS NOT NULL) AS has_logo, created_at
       FROM locations WHERE id = $1`,
      [id]
    );
    return (result.rows[0] as LocationDetail) ?? null;
  }

  const row = getSqliteDb()
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
export async function updateLocation(
  id: string,
  input: LocationUpdateInput
): Promise<{ found: boolean; instructionsChanged: boolean }> {
  const setLogo = input.logo !== undefined && input.logo !== null;
  const clearLogo = Boolean(input.clearLogo);

  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const pool = getPgPool();
    const existing = await pool.query(`SELECT instructions FROM locations WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return { found: false, instructionsChanged: false };
    const previousInstructions = existing.rows[0].instructions as string;

    const setClauses = ['name = $2', 'instructions = $3', 'contact_name = $4', 'contact_email = $5', 'contact_phone = $6'];
    const values: unknown[] = [
      id,
      input.name,
      input.instructions,
      input.contact_name ?? null,
      input.contact_email ?? null,
      input.contact_phone ?? null,
    ];
    if (setLogo) {
      values.push(input.logo!.data, input.logo!.mime);
      setClauses.push(`logo = $${values.length - 1}`, `logo_mime = $${values.length}`);
    } else if (clearLogo) {
      setClauses.push('logo = NULL', 'logo_mime = NULL');
    }

    await pool.query(
      `UPDATE locations SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      values
    );
    return { found: true, instructionsChanged: previousInstructions !== input.instructions };
  }

  const existing = getSqliteDb().prepare(`SELECT instructions FROM locations WHERE id = ?`).get(id) as
    | { instructions: string }
    | undefined;
  if (!existing) return { found: false, instructionsChanged: false };

  getSqliteDb()
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

export async function deleteLocation(id: string): Promise<boolean> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const pool = getPgPool();
    const result = await pool.query(`DELETE FROM locations WHERE id = $1`, [id]);
    await pool.query(`DELETE FROM location_faqs WHERE location_id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  const result = getSqliteDb().prepare(`DELETE FROM locations WHERE id = ?`).run(id);
  getSqliteDb().prepare(`DELETE FROM location_faqs WHERE location_id = ?`).run(id);
  return result.changes > 0;
}

export async function getLocationLogo(id: string): Promise<LocationLogo | null> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query(
      `SELECT logo, logo_mime FROM locations WHERE id = $1 AND logo IS NOT NULL`,
      [id]
    );
    const row = result.rows[0] as { logo: Buffer; logo_mime: string } | undefined;
    if (!row) return null;
    return { data: row.logo, mime: row.logo_mime };
  }

  const row = getSqliteDb()
    .prepare(`SELECT logo, logo_mime FROM locations WHERE id = ? AND logo IS NOT NULL`)
    .get(id) as { logo: Buffer; logo_mime: string } | undefined;
  if (!row) return null;
  return { data: row.logo, mime: row.logo_mime };
}

export async function saveLocationFaqs(
  locationId: string,
  faqs: LocationFaqQuestion[],
  status: FaqGenerationStatus
): Promise<void> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    await getPgPool().query(
      `INSERT INTO location_faqs (location_id, faqs_json, generated_at, generation_status)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
       ON CONFLICT (location_id) DO UPDATE SET
         faqs_json = excluded.faqs_json,
         generated_at = excluded.generated_at,
         generation_status = excluded.generation_status`,
      [locationId, JSON.stringify(faqs), status]
    );
    return;
  }

  getSqliteDb()
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

function parseFaqs(faqsJson: string): LocationFaqQuestion[] {
  const parsed = JSON.parse(faqsJson) as unknown[];
  // Backward compatible with rows saved before keyPhrase existed (plain
  // string[]) — wrap them into the current shape with no keyPhrase, rather
  // than breaking on old cached locations.
  return parsed.map((item) =>
    typeof item === 'string' ? { text: item, keyPhrase: null } : (item as LocationFaqQuestion)
  );
}

export async function getLocationFaqs(id: string): Promise<LocationFaqs | null> {
  if (isPostgresConfigured()) {
    await ensurePgSchema();
    const result = await getPgPool().query(
      `SELECT location_id, faqs_json, generated_at, generation_status FROM location_faqs WHERE location_id = $1`,
      [id]
    );
    const row = result.rows[0] as
      | { location_id: string; faqs_json: string; generated_at: string; generation_status: FaqGenerationStatus }
      | undefined;
    if (!row) return null;
    return {
      locationId: row.location_id,
      faqs: parseFaqs(row.faqs_json),
      generatedAt: row.generated_at,
      status: row.generation_status,
    };
  }

  const row = getSqliteDb()
    .prepare(
      `SELECT location_id, faqs_json, generated_at, generation_status FROM location_faqs WHERE location_id = ?`
    )
    .get(id) as
    | { location_id: string; faqs_json: string; generated_at: string; generation_status: FaqGenerationStatus }
    | undefined;
  if (!row) return null;
  return {
    locationId: row.location_id,
    faqs: parseFaqs(row.faqs_json),
    generatedAt: row.generated_at,
    status: row.generation_status,
  };
}
