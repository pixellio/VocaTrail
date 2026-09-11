import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, getSession, isSuperAdmin } from '@/lib/session';

export interface VendorViewer {
  email: string;
  isSuperAdmin: boolean;
}

/** Server-component guard for pages under /vendor — redirects to Google sign-in if not a vendor (or super admin). */
export async function requireVendorPage(): Promise<VendorViewer> {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);
  const admin = session ? isSuperAdmin(session.email) : false;

  if (!session || (session.role !== 'vendor' && !admin)) {
    redirect('/vendor/login');
  }

  return { email: session.email, isSuperAdmin: admin };
}
