import { NextRequest, NextResponse } from 'next/server';
import { createRefreshToken } from '@/lib/mobileAuthDatabase';
import { createAccessToken, ACCESS_TOKEN_TTL_MS } from '@/lib/mobileAuth';
import { findUserByEmail } from '@/lib/usersDatabase';
import { getPasswordHash } from '@/lib/userCredentialsDatabase';
import { verifyPassword } from '@/lib/passwordHash';

// Best-effort brute-force throttle (per server instance — serverless
// instances don't share memory, so this slows casual guessing only).
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function isLocked(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || entry.resetAt < Date.now()) {
    failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

// Verified against when the account doesn't exist, to keep timing similar.
const DUMMY_HASH = 'scrypt$16384$8$1$00000000000000000000000000000000$' + '00'.repeat(64);

// POST /api/auth/mobile/password-login - email + password -> the same
// access/refresh token pair the Google flow issues (see mobile/token).
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'email and password are required' }, { status: 400 });
    }

    const key = email.trim().toLowerCase();
    if (isLocked(key)) {
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Try again later.' },
        { status: 429 }
      );
    }

    const user = await findUserByEmail(key);
    const storedHash = user ? await getPasswordHash(user.id) : null;
    const ok = await verifyPassword(password, storedHash ?? DUMMY_HASH);

    // Same response for unknown email / no password set / wrong password,
    // so it doesn't reveal which accounts exist.
    if (!user || !storedHash || !ok) {
      recordFailure(key);
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    failures.delete(key);
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
    console.error('Mobile password login failed:', error);
    return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 });
  }
}
