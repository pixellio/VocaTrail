/**
 * QR Payload → Phrase Normalization
 *
 * A location QR code (see the /vendor dashboard) encodes just that
 * location's registered ID; scanning it looks up its instructions via the
 * public /api/locations/[id] endpoint. Older/manual QR content (a JSON
 * object, or just plain text) is still supported as a fallback so the
 * scanner's manual-paste path keeps working. This module only normalizes
 * whatever was scanned into a phrase string — it deliberately does not
 * duplicate the interpret → concepts → cards pipeline in
 * contextBoard.ts / conceptToCard.ts, it just feeds into it.
 */

export interface LocationPayload {
  title?: string;
  instructions?: string;
  phrase?: string;
}

export function parseLocationPayload(raw: string): LocationPayload {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const { title, instructions, phrase } = parsed as Record<string, unknown>;
      return {
        title: typeof title === 'string' ? title : undefined,
        instructions: typeof instructions === 'string' ? instructions : undefined,
        phrase: typeof phrase === 'string' ? phrase : undefined,
      };
    }
  } catch {
    // Not JSON — treat the raw scan as the phrase itself.
  }

  return { phrase: trimmed };
}

export function resolvePhraseFromPayload(payload: LocationPayload): string {
  return payload.phrase || payload.instructions || '';
}

/**
 * Looks up a scanned string as a registered location ID against the public
 * lookup endpoint. Returns null if it isn't a known location (including on
 * network/parse errors), so callers can fall back to parseLocationPayload.
 */
export async function resolveLocationById(id: string): Promise<LocationPayload | null> {
  if (!id) return null;

  try {
    const response = await fetch(`/api/locations/${encodeURIComponent(id)}`);
    if (!response.ok) return null;

    const result = await response.json();
    if (!result.success || !result.data) return null;

    const { name, instructions } = result.data as { name?: string; instructions?: string };
    if (typeof instructions !== 'string' || !instructions.trim()) return null;

    return { title: typeof name === 'string' ? name : undefined, instructions };
  } catch {
    return null;
  }
}
