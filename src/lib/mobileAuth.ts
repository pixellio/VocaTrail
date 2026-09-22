import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { findUserByEmail, type UserRole } from '@/lib/usersDatabase';

/**
 * Short-lived JWT access tokens for the mobile app, issued after the
 * Authorization-Code handoff in /api/auth/mobile/token. Deliberately
 * separate from session.ts's cookie secret so the two auth mechanisms don't
 * share key material — see mobileAuthDatabase.ts for the long-lived,
 * revocable refresh-token side of this flow.
 */

const ACCESS_TOKEN_TTL_SECONDS = 20 * 60; // 20 minutes

export interface MobileAccessTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('MOBILE_JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(payload: MobileAccessTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAccessToken(token: string): Promise<MobileAccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null;
    }
    return { sub: payload.sub, email: payload.email, role: payload.role as UserRole };
  } catch {
    return null; // expired, malformed, or bad signature
  }
}

export const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;

// Validates the Authorization: Bearer <token> header on a mobile API route.
// Mirrors requireVendorAuth()'s shape (src/app/api/locations/route.ts) but
// for the mobile app's Bearer-token auth instead of the web session cookie.
export async function requireMobileAuth(
  request: NextRequest
): Promise<{ userId: string; email: string; role: UserRole } | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  // Confirms the user still exists (e.g. wasn't somehow removed) rather than
  // trusting the token's claims blindly for the rest of the request's life.
  const user = findUserByEmail(payload.email);
  if (!user || user.id !== payload.sub) return null;

  return { userId: user.id, email: user.email, role: user.role };
}
