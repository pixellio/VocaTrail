import type { Metadata } from 'next';
import { getLocationById, getLocationFaqs } from '@/lib/locationsDatabase';
import LocationQRCode from '@/components/LocationQRCode';

export const metadata: Metadata = {
  title: 'Demo QR Code - VoxaBoard',
  description: 'A sample location QR code for trying out the VoxaBoard mobile app.',
};

// Read at request time so changing DEMO_LOCATION_ID needs no rebuild.
export const dynamic = 'force-dynamic';

// Public page for app reviewers (e.g. Google Play): shows a scannable QR code
// for one demo location, chosen with the DEMO_LOCATION_ID env variable.
export default async function DemoPage() {
  const id = process.env.DEMO_LOCATION_ID?.trim();
  const location = id ? await getLocationById(id) : null;
  const faqs = location ? await getLocationFaqs(location.id) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">VoxaBoard demo QR code</h1>

        {location && faqs ? (
          <>
            <p className="text-gray-600 mb-6">
              In the VoxaBoard app, open the menu, tap <strong>Scan QR</strong> and point the camera at this
              code. The app loads the questions for <strong>{location.name}</strong> and builds a vocabulary
              board.
            </p>
            <LocationQRCode locationId={location.id} locationName={location.name} hasLogo={false} />
          </>
        ) : (
          <p className="text-gray-600">The demo location is not available right now.</p>
        )}
      </div>
    </div>
  );
}
