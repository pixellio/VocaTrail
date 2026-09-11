import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, getSession, isSuperAdmin } from '@/lib/session';

/** Server-component guard for super-admin-only pages (vendor management). */
export async function requireSuperAdminPage(): Promise<string> {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session || !isSuperAdmin(session.email)) {
    redirect('/vendor/login');
  }

  return session.email;
}
