import { createHmac, timingSafeEqual } from 'crypto';
import type { UserRole } from '@/lib/usersDatabase';

/**
 * Unified app session: any Google account can hold one (role 'user' or
 * 'vendor'). Super admin is not a stored role — it's derived from
 * SUPER_ADMIN_EMAILS at verify time, same static-list idiom the old
 * vendor-only allow-list used.
 */

export const SESSION_COOKIE = 'voxaboard_session';
export const OAUTH_STATE_COOKIE = 'voxaboard_oauth_state';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface Session {
  email: string;
  role: UserRole;
}

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  return secret && secret.trim() ? secret : null;
}

function getSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(email: string): boolean {
  return getSuperAdminEmails().includes(email.trim().toLowerCase());
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);
}

function sign(payload: string): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(email: string, role: UserRole): string | null {
  const payload = JSON.stringify({ email, role, exp: Date.now() + SESSION_MAX_AGE_MS });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = sign(encodedPayload);
  if (!signature) return null;
  return `${encodedPayload}.${signature}`;
}

/** Verifies the session cookie and returns the signed-in user's session, or null. */
export function getSession(cookieValue: string | undefined | null): Session | null {
  if (!cookieValue) return null;
  const [encodedPayload, signature] = cookieValue.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  if (!expectedSignature) return null;

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { email, role, exp } = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (typeof email !== 'string' || typeof role !== 'string' || typeof exp !== 'number') return null;
    if (Date.now() > exp) return null;
    return { email, role: role as UserRole };
  } catch {
    return null;
  }
}
