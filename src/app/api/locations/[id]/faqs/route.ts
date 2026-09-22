import { NextResponse } from 'next/server';
import { getLocationFaqs } from '@/lib/locationsDatabase';

// GET /api/locations/[id]/faqs - public lookup used by the mobile AAC app's QR scan flow.
// Mirrors the public GET /api/locations/[id] endpoint: no auth, safe fields only.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const faqs = getLocationFaqs(id);
    if (!faqs) {
      return NextResponse.json({ success: false, error: 'No FAQs found for this location.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: faqs });
  } catch (error) {
    console.error('Failed to fetch location FAQs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch location FAQs.' }, { status: 500 });
  }
}
