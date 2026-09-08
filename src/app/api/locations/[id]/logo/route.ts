import { NextResponse } from 'next/server';
import { getLocationLogo } from '@/lib/locationsDatabase';

// GET /api/locations/[id]/logo - public, streams the stored logo image if present.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const logo = getLocationLogo(id);
  if (!logo) {
    return NextResponse.json({ success: false, error: 'No logo for this location.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(logo.data), {
    status: 200,
    headers: {
      'Content-Type': logo.mime,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
