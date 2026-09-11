import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireSuperAdminPage } from '@/lib/adminAuth';
import { listUsers } from '@/lib/usersDatabase';
import VendorRoleToggle from '@/components/VendorRoleToggle';

export default async function VendorManagementPage() {
  await requireSuperAdminPage();
  const users = listUsers();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <Link href="/vendor" className="flex items-center gap-1 text-sm text-purple-600 hover:underline mb-4">
          <ArrowLeft size={16} />
          Back to vendor dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Manage vendors</h1>
        <p className="text-sm text-gray-500 mb-6">Promote or demote which signed-in accounts can access the vendor dashboard.</p>

        {users.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No one has signed in yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-gray-800">{user.name || user.email}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <VendorRoleToggle userId={user.id} role={user.role} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
