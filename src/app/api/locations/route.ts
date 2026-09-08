import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createLocation, getAllLocations } from '@/lib/locationsDatabase';
import { VENDOR_SESSION_COOKIE, verifyVendorSession } from '@/lib/vendorSession';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

async function requireVendorAuth() {
  const cookieStore = await cookies();
  return verifyVendorSession(cookieStore.get(VENDOR_SESSION_COOKIE)?.value);
}

// GET /api/locations - list locations for the dashboard (protected)
export async function GET() {
  if (!(await requireVendorAuth())) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const locations = getAllLocations();
    return NextResponse.json({ success: true, data: locations });
  } catch (error) {
    console.error('Failed to list locations:', error);
    return NextResponse.json({ success: false, error: 'Failed to list locations.' }, { status: 500 });
  }
}

// POST /api/locations - register a new location (protected)
export async function POST(request: NextRequest) {
  if (!(await requireVendorAuth())) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = String(formData.get('name') ?? '').trim();
    const instructions = String(formData.get('instructions') ?? '').trim();
    const contactName = String(formData.get('contact_name') ?? '').trim();
    const contactEmail = String(formData.get('contact_email') ?? '').trim();
    const contactPhone = String(formData.get('contact_phone') ?? '').trim();
    const logoFile = formData.get('logo');

    if (!name || !instructions) {
      return NextResponse.json(
        { success: false, error: 'Location name and instructions are required.' },
        { status: 400 }
      );
    }

    let logo: { data: Buffer; mime: string } | null = null;
    if (logoFile instanceof File && logoFile.size > 0) {
      if (!ALLOWED_LOGO_TYPES.has(logoFile.type)) {
        return NextResponse.json(
          { success: false, error: 'Logo must be a PNG, JPEG, WebP, or SVG image.' },
          { status: 400 }
        );
      }
      if (logoFile.size > MAX_LOGO_BYTES) {
        return NextResponse.json(
          { success: false, error: 'Logo must be smaller than 2MB.' },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      logo = { data: buffer, mime: logoFile.type };
    }

    const { id } = createLocation({
      name,
      instructions,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      logo,
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to create location:', error);
    return NextResponse.json({ success: false, error: 'Failed to create location.' }, { status: 500 });
  }
}
