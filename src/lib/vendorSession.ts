import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Lightweight, stateless "session" for the vendor/location dashboard: a
 * single shared passcode (env var), not a real account system. This is an
 * interim gate — Google OAuth with proper per-user roles is planned as a
 * follow-up once those credentials are available.
 */

export const VENDOR_SESSION_COOKIE = 'vendor_session';

function getPasscode(): string | null {
  const passcode = process.env.VENDOR_DASHBOARD_PASSCODE;
  return passcode && passcode.trim() ? passcode : null;
}

export function isVendorAuthConfigured(): boolean {
  return getPasscode() !== null;
}

export function checkVendorPasscode(candidate: string): boolean {
  const passcode = getPasscode();
  if (!passcode) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(passcode);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createVendorSessionToken(): string | null {
  const passcode = getPasscode();
  if (!passcode) return null;
  return createHmac('sha256', passcode).update('vendor').digest('hex');
}

export function verifyVendorSession(cookieValue: string | undefined | null): boolean {
  if (!cookieValue) return false;
  const expected = createVendorSessionToken();
  if (!expected) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
