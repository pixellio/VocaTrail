import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, getSession, isSuperAdmin } from '@/lib/session';
import { listUsers } from '@/lib/usersDatabase';

async function requireSuperAdminAuth() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);
  return session && isSuperAdmin(session.email);
}

// GET /api/admin/users - list all users (super admin only)
export async function GET() {
  if (!(await requireSuperAdminAuth())) {
    return NextResponse.json({ success: false, error: 'Not authorized.' }, { status: 403 });
  }

  const users = listUsers();
  return NextResponse.json({ success: true, data: users });
}
