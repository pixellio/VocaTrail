import Link from 'next/link';
import { Plus, MapPin } from 'lucide-react';
import { requireVendorPage } from '@/lib/vendorAuth';
import { getAllLocations } from '@/lib/locationsDatabase';
import VendorLogoutButton from '@/components/VendorLogoutButton';

export default async function VendorDashboardPage() {
  await requireVendorPage();
  const locations = getAllLocations();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Location Dashboard</h1>
            <p className="text-sm text-gray-500">Registered locations for VoxaBoard&apos;s QR context boards</p>
          </div>
          <VendorLogoutButton />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-end mb-4">
          <Link
            href="/vendor/new"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={16} />
            Register a location
          </Link>
        </div>

        {locations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MapPin size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No locations registered yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
            {locations.map((location) => (
              <Link
                key={location.id}
                href={`/vendor/${location.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-800">{location.name}</p>
                  <p className="text-sm text-gray-500">
                    {location.contact_name || location.contact_email || 'No contact info'}
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(location.created_at).toLocaleDateString()}
                  {location.has_logo && <span className="ml-2">🖼️</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
