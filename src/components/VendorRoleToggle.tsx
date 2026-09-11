'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/lib/usersDatabase';

export default function VendorRoleToggle({ userId, role }: { userId: string; role: UserRole }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVendor = role === 'vendor';

  const handleToggle = async () => {
    setIsSubmitting(true);
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: isVendor ? 'user' : 'vendor' }),
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isSubmitting}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border ${
        isVendor
          ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
      } disabled:opacity-50`}
    >
      {isSubmitting && <Loader2 size={14} className="animate-spin" />}
      {isVendor ? 'Vendor · Revoke' : 'Make vendor'}
    </button>
  );
}
