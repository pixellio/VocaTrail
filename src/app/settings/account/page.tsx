import { cookies } from 'next/headers';
import { LogIn, User as UserIcon } from 'lucide-react';
import { SESSION_COOKIE, getSession, isSuperAdmin } from '@/lib/session';
import SessionLogoutButton from '@/components/SessionLogoutButton';

export default async function AccountSettingsPage() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (session) {
    const roleLabel = isSuperAdmin(session.email) ? 'Super admin' : session.role === 'vendor' ? 'Vendor' : 'Signed in';

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
          <UserIcon size={28} className="text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">{session.email}</h2>
        <p className="text-sm text-gray-500 mb-6">{roleLabel}</p>
        <SessionLogoutButton />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <LogIn size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Not signed in</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Signing in stays optional for using the board — it just lets you save your board and
        settings across devices.
      </p>
      <a
        href="/api/auth/google/login?intent=user&returnTo=/settings/account"
        className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Log in with Google
      </a>
    </div>
  );
}
