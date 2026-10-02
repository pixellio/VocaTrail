import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { upsertUserOnLogin } from '@/lib/usersDatabase';
import { setPasswordHash } from '@/lib/userCredentialsDatabase';
import { hashPassword } from '@/lib/passwordHash';

// POST /api/admin/password-users - one-off provisioning of an email+password
// account (e.g. the Google Play reviewer) without shell access to the
// database. Disabled (404) unless PASSWORD_USER_SETUP_TOKEN is set in the
// environment; remove that variable after use to switch it off again.
//
//   curl -X POST https://www.voxaboard.com/api/admin/password-users \
//     -H "x-setup-token: <PASSWORD_USER_SETUP_TOKEN>" -H "content-type: application/json" \
//     -d '{"email":"...","password":"...","name":"..."}'
export async function POST(request: NextRequest) {
  const expected = process.env.PASSWORD_USER_SETUP_TOKEN;
  if (!expected || !expected.trim()) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  const provided = request.headers.get('x-setup-token') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { email, password, name } = await request.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 10) {
      return NextResponse.json({ success: false, error: 'Password must be at least 10 characters.' }, { status: 400 });
    }

    const user = await upsertUserOnLogin(email.trim(), typeof name === 'string' ? name : undefined, 'user');
    await setPasswordHash(user.id, await hashPassword(password));

    return NextResponse.json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Password user provisioning failed:', error);
    return NextResponse.json({ success: false, error: 'Provisioning failed.' }, { status: 500 });
  }
}
