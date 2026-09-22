import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, fetchGoogleUserInfo, getGoogleRedirectUri } from '@/lib/googleAuth';
import { OAUTH_STATE_COOKIE, SESSION_COOKIE, createSessionToken } from '@/lib/session';
import { upsertUserOnLogin } from '@/lib/usersDatabase';
import { createAuthCode } from '@/lib/mobileAuthDatabase';

interface OAuthStateCookie {
  state: string;
  intent: 'vendor' | 'user';
  returnTo: string | null;
  client: 'mobile' | null;
  codeChallenge: string | null;
}

// GET /api/auth/google/callback - Google redirects here after sign-in
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const rawStateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  const defaultFailureUrl = new URL('/vendor/login', request.url);
  const failure = (reason: string, failureUrl = defaultFailureUrl) => {
    failureUrl.searchParams.set('error', reason);
    const response = NextResponse.redirect(failureUrl);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  };

  let stateCookie: OAuthStateCookie | null = null;
  try {
    stateCookie = rawStateCookie ? JSON.parse(rawStateCookie) : null;
  } catch {
    stateCookie = null;
  }

  if (!code || !state || !stateCookie || state !== stateCookie.state) {
    return failure('invalid_state');
  }

  const failureUrl =
    stateCookie.intent === 'vendor'
      ? defaultFailureUrl
      : new URL(stateCookie.returnTo ?? '/settings/account', request.url);

  const redirectUri = getGoogleRedirectUri(request);
  const tokens = await exchangeCodeForTokens(code, redirectUri);
  if (!tokens?.access_token) {
    return failure('token_exchange_failed', failureUrl);
  }

  const profile = await fetchGoogleUserInfo(tokens.access_token);
  if (!profile?.email || !profile.email_verified) {
    return failure('unverified_email', failureUrl);
  }

  const user = await upsertUserOnLogin(
    profile.email,
    profile.name,
    stateCookie.intent === 'vendor' ? 'vendor' : 'user'
  );

  // Mobile handoff: skip the web session cookie entirely — hand back a
  // short-lived one-time code instead. The app exchanges it (with its PKCE
  // code_verifier) for a real access/refresh token pair at
  // POST /api/auth/mobile/token; nothing sensitive travels in this redirect
  // — the code alone is useless without the verifier, which never leaves
  // the app instance that started the flow.
  //
  // The verified App Link (https://voxaboard.com/mobile-auth-callback) only
  // resolves on the real production domain — Android won't verify App Link
  // ownership against a LAN dev IP like the one used for local testing this
  // session. Per RFC 8252, a custom-scheme redirect is an accepted fallback
  // specifically because PKCE (above) removes the old security reason that
  // redirect URI had to be domain-verified in the first place. So: real App
  // Link in production, custom scheme when running against anything else.
  if (stateCookie.client === 'mobile' && stateCookie.codeChallenge) {
    const authCode = await createAuthCode(user.id, stateCookie.codeChallenge);
    const isProductionDomain = new URL(request.url).hostname === 'voxaboard.com';
    const mobileCallbackUrl = isProductionDomain
      ? new URL('/mobile-auth-callback', request.url)
      : new URL('voxaboard://mobile-auth-callback');
    mobileCallbackUrl.searchParams.set('code', authCode);
    const response = NextResponse.redirect(mobileCallbackUrl);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  const token = createSessionToken(user.email, user.role);
  if (!token) {
    return failure('session_unconfigured', failureUrl);
  }

  const destination =
    stateCookie.returnTo ?? (stateCookie.intent === 'vendor' ? '/vendor' : '/settings/account');

  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
