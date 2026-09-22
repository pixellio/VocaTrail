import { NextRequest, NextResponse } from 'next/server';
import { revokeRefreshToken } from '@/lib/mobileAuthDatabase';

// POST /api/auth/mobile/logout - revokes a refresh token immediately.
// The device's current access token (if any) keeps working until it
// naturally expires (<=20 minutes) — genuinely instant revocation would
// require checking a revocation list on every request, which trades away
// the point of using a stateless access token in the first place. Revoking
// the refresh token is what actually locks the device out going forward.
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ success: false, error: 'refreshToken is required' }, { status: 400 });
    }

    await revokeRefreshToken(refreshToken);

    return NextResponse.json({ success: true, data: { loggedOut: true } });
  } catch (error) {
    console.error('Mobile logout failed:', error);
    return NextResponse.json({ success: false, error: 'Logout failed.' }, { status: 500 });
  }
}
