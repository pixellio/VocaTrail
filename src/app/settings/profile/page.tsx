import { cookies } from 'next/headers';
import { User } from 'lucide-react';
import { SESSION_COOKIE, getSession } from '@/lib/session';

export default async function ProfileSettingsPage() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (session) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
          <User size={28} className="text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">{session.email}</h2>
        <p className="text-sm text-gray-500">Your board and settings are saved to this account.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <User size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">You&apos;re not signed in yet</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Sign in to save your board and settings across devices.
      </p>
      <a
        href="/api/auth/google/login?intent=user&returnTo=/settings/profile"
        className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Sign in with Google
      </a>
    </div>
  );
}
