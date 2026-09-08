import { NextRequest, NextResponse } from 'next/server';
import {
  VENDOR_SESSION_COOKIE,
  checkVendorPasscode,
  createVendorSessionToken,
  isVendorAuthConfigured,
} from '@/lib/vendorSession';

export async function POST(request: NextRequest) {
  if (!isVendorAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Vendor dashboard passcode is not configured on the server.' },
      { status: 503 }
    );
  }

  const { passcode } = await request.json().catch(() => ({ passcode: '' }));

  if (typeof passcode !== 'string' || !checkVendorPasscode(passcode)) {
    return NextResponse.json({ success: false, error: 'Incorrect passcode.' }, { status: 401 });
  }

  const token = createVendorSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(VENDOR_SESSION_COOKIE, token as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(VENDOR_SESSION_COOKIE);
  return response;
}
