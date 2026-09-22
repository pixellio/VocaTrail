import { NextRequest, NextResponse } from 'next/server';
import { findValidRefreshToken } from '@/lib/mobileAuthDatabase';
import { createAccessToken, ACCESS_TOKEN_TTL_MS } from '@/lib/mobileAuth';
import { listUsers } from '@/lib/usersDatabase';

// POST /api/auth/mobile/refresh - exchanges a still-valid refresh token for
// a new access token. This is where revocation actually takes effect: a
// refresh token deleted/revoked via /api/auth/mobile/logout (or a future
// "sign out this device" admin action) fails here immediately, even though
// the caller's last access token may still have a few minutes left on it.
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ success: false, error: 'refreshToken is required' }, { status: 400 });
    }

    const valid = await findValidRefreshToken(refreshToken);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Refresh token is invalid, expired, or revoked.' },
        { status: 401 }
      );
    }

    const users = await listUsers();
    const user = users.find((u) => u.id === valid.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 401 });
    }

    const accessToken = await createAccessToken({ sub: user.id, email: user.email, role: user.role });

    return NextResponse.json({
      success: true,
      data: { accessToken, expiresInMs: ACCESS_TOKEN_TTL_MS },
    });
  } catch (error) {
    console.error('Mobile token refresh failed:', error);
    return NextResponse.json({ success: false, error: 'Token refresh failed.' }, { status: 500 });
  }
}
