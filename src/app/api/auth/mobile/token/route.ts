import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { consumeAuthCode, createRefreshToken } from '@/lib/mobileAuthDatabase';
import { createAccessToken, ACCESS_TOKEN_TTL_MS } from '@/lib/mobileAuth';
import { listUsers, type AppUser } from '@/lib/usersDatabase';

// PKCE S256: code_challenge = BASE64URL(SHA256(code_verifier)), verified
// server-side against what was stored when the auth code was issued
// (google/callback/route.ts) — proves this is the same app instance that
// started the login, not just whoever intercepted the redirect.
function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash('sha256').update(codeVerifier).digest('base64url');
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function findUserById(userId: string): Promise<AppUser | null> {
  // usersDatabase.ts only exposes lookup by email; the auth-code row stores
  // the user id, so resolve via a small scan rather than adding a new export
  // just for this — user counts here are small (Google-authenticated app
  // users, not a public dataset).
  const users = await listUsers();
  return users.find((u) => u.id === userId) ?? null;
}

// POST /api/auth/mobile/token - exchanges a one-time auth code (from the
// App Link handoff) + PKCE verifier for an access/refresh token pair.
export async function POST(request: NextRequest) {
  try {
    const { code, code_verifier: codeVerifier } = await request.json();

    if (!code || typeof code !== 'string' || !codeVerifier || typeof codeVerifier !== 'string') {
      return NextResponse.json(
        { success: false, error: 'code and code_verifier are required' },
        { status: 400 }
      );
    }

    const consumed = await consumeAuthCode(code);
    if (!consumed) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code.' },
        { status: 401 }
      );
    }

    if (!verifyPkce(codeVerifier, consumed.codeChallenge)) {
      return NextResponse.json({ success: false, error: 'PKCE verification failed.' }, { status: 401 });
    }

    const user = await findUserById(consumed.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 401 });
    }

    const accessToken = await createAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = await createRefreshToken(user.id);

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresInMs: ACCESS_TOKEN_TTL_MS,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  } catch (error) {
    console.error('Mobile token exchange failed:', error);
    return NextResponse.json({ success: false, error: 'Token exchange failed.' }, { status: 500 });
  }
}
