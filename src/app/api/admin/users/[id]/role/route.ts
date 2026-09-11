import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, getSession, isSuperAdmin } from '@/lib/session';
import { setUserRole, type UserRole } from '@/lib/usersDatabase';

async function requireSuperAdminAuth() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);
  return session && isSuperAdmin(session.email);
}

// POST /api/admin/users/[id]/role - promote/demote a user (super admin only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSuperAdminAuth())) {
    return NextResponse.json({ success: false, error: 'Not authorized.' }, { status: 403 });
  }

  const { id } = await params;
  const { role } = await request.json().catch(() => ({ role: null }));

  if (role !== 'user' && role !== 'vendor') {
    return NextResponse.json({ success: false, error: 'Role must be "user" or "vendor".' }, { status: 400 });
  }

  setUserRole(id, role as UserRole);
  return NextResponse.json({ success: true });
}
