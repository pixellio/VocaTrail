import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildGoogleAuthUrl, getGoogleRedirectUri } from '@/lib/googleAuth';
import { isGoogleAuthConfigured, OAUTH_STATE_COOKIE } from '@/lib/session';

// GET /api/auth/google/login?intent=vendor|user&returnTo=/path - starts Google sign-in
// GET /api/auth/google/login?client=mobile&code_challenge=... - mobile app's PKCE handoff
// (see /api/auth/google/callback and /api/auth/mobile/token for the rest of that flow)
export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured on the server.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const intent = searchParams.get('intent') === 'vendor' ? 'vendor' : 'user';
  const returnToParam = searchParams.get('returnTo');
  const returnTo = returnToParam && returnToParam.startsWith('/') ? returnToParam : null;
  const client = searchParams.get('client') === 'mobile' ? 'mobile' : null;
  const codeChallenge = client === 'mobile' ? searchParams.get('code_challenge') : null;
  if (client === 'mobile' && !codeChallenge) {
    return NextResponse.json({ error: 'code_challenge is required for client=mobile' }, { status: 400 });
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = getGoogleRedirectUri(request);
  const authUrl = buildGoogleAuthUrl(redirectUri, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, intent, returnTo, client, codeChallenge }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    }
  );
  return response;
}
