'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, User, Languages, LogIn } from 'lucide-react';

const TABS = [
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/language', label: 'Language', icon: Languages },
  { href: '/settings/account', label: 'Account', icon: LogIn },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <Link href="/" className="flex items-center gap-1 text-sm text-purple-600 hover:underline mb-4">
          <ArrowLeft size={16} />
          Back to board
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">Settings</h1>

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {TABS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  isActive
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
