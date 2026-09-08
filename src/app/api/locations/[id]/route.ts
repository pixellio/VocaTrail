import { NextResponse } from 'next/server';
import { getLocationById } from '@/lib/locationsDatabase';

// GET /api/locations/[id] - public lookup used by the AAC app's QR scan flow.
// Intentionally returns only public fields (no contact info).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const location = getLocationById(id);
    if (!location) {
      return NextResponse.json({ success: false, error: 'Location not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: location });
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch location.' }, { status: 500 });
  }
}
