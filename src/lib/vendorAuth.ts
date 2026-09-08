import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { VENDOR_SESSION_COOKIE, verifyVendorSession } from '@/lib/vendorSession';

/** Server-component guard for pages under /vendor — redirects to the passcode login if not authenticated. */
export async function requireVendorPage() {
  const cookieStore = await cookies();
  const authenticated = verifyVendorSession(cookieStore.get(VENDOR_SESSION_COOKIE)?.value);
  if (!authenticated) {
    redirect('/vendor/login');
  }
}
