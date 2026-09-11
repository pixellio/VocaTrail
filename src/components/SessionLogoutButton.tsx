'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function SessionLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
    >
      <LogOut size={16} />
      Log out
    </button>
  );
}
