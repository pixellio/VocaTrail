import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireVendorPage } from '@/lib/vendorAuth';
import { getLocationDetail } from '@/lib/locationsDatabase';
import EditLocationForm from '@/components/EditLocationForm';

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireVendorPage();
  const { id } = await params;

  const location = await getLocationDetail(id);
  if (!location) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <Link
          href={`/vendor/${id}`}
          className="flex items-center gap-1 text-sm text-purple-600 hover:underline mb-4"
        >
          <ArrowLeft size={16} />
          Back to location
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Edit Location</h1>
        <p className="text-sm text-gray-500 mb-6">
          The QR code stays the same — it just encodes this location&apos;s ID.
        </p>

        <EditLocationForm location={location} />
      </div>
    </div>
  );
}
