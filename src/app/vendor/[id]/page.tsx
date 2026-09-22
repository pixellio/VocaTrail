import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { requireVendorPage } from '@/lib/vendorAuth';
import { getAllLocations, getLocationById, getLocationFaqs } from '@/lib/locationsDatabase';
import LocationQRCode from '@/components/LocationQRCode';
import FaqGenerationPanel from '@/components/FaqGenerationPanel';
import DeleteLocationButton from '@/components/DeleteLocationButton';

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireVendorPage();
  const { id } = await params;

  const location = await getLocationById(id);
  if (!location) {
    notFound();
  }

  const summary = (await getAllLocations()).find((entry) => entry.id === id);
  const faqRecord = await getLocationFaqs(id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/vendor" className="flex items-center gap-1 text-sm text-purple-600 hover:underline">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/vendor/${id}/edit`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:underline"
            >
              <Pencil size={14} />
              Edit
            </Link>
            <DeleteLocationButton locationId={id} locationName={location.name} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{location.name}</h1>
          <p className="text-sm text-gray-500 mb-4">Location ID: {location.id}</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Instructions</p>
            <p className="text-gray-800 whitespace-pre-wrap">{location.instructions}</p>
          </div>

          {summary && (summary.contact_name || summary.contact_email || summary.contact_phone) && (
            <div className="mt-4 text-sm text-gray-500 space-y-1">
              {summary.contact_name && <p>Contact: {summary.contact_name}</p>}
              {summary.contact_email && <p>Email: {summary.contact_email}</p>}
              {summary.contact_phone && <p>Phone: {summary.contact_phone}</p>}
            </div>
          )}
        </div>

        <FaqGenerationPanel
          locationId={location.id}
          initialFaqs={faqRecord?.faqs ?? []}
          initialStatus={faqRecord?.status ?? 'none'}
        />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Location QR Code</h2>
          <p className="text-sm text-gray-500 mb-4">
            Print this and place it at the location. Scanning it in VoxaBoard generates a
            vocabulary board from the instructions above.
          </p>
          <LocationQRCode locationId={location.id} locationName={location.name} hasLogo={Boolean(summary?.has_logo)} />
        </div>
      </div>
    </div>
  );
}
