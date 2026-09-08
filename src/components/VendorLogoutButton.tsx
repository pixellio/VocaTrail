'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function VendorLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/vendor/session', { method: 'DELETE' });
    router.push('/vendor/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
    >
      <LogOut size={16} />
      Log out
    </button>
  );
}
