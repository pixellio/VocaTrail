import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getLocationById,
  updateLocation,
  deleteLocation,
  saveLocationFaqs,
} from '@/lib/locationsDatabase';
import { generateFaqsWithGemini } from '@/lib/faqGenerationService';
import { SESSION_COOKIE, getSession, isSuperAdmin } from '@/lib/session';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

async function requireVendorAuth() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return false;
  return session.role === 'vendor' || isSuperAdmin(session.email);
}

// GET /api/locations/[id] - public lookup used by the AAC app's QR scan flow.
// Intentionally returns only public fields (no contact info).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const location = await getLocationById(id);
    if (!location) {
      return NextResponse.json({ success: false, error: 'Location not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: location });
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch location.' }, { status: 500 });
  }
}

// PATCH /api/locations/[id] - update a location's details (protected).
// If the instructions text changes, FAQs are regenerated automatically since
// the previously stored ones would otherwise silently go stale.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireVendorAuth())) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const formData = await request.formData();
    const name = String(formData.get('name') ?? '').trim();
    const instructions = String(formData.get('instructions') ?? '').trim();
    const contactName = String(formData.get('contact_name') ?? '').trim();
    const contactEmail = String(formData.get('contact_email') ?? '').trim();
    const contactPhone = String(formData.get('contact_phone') ?? '').trim();
    const clearLogo = formData.get('clear_logo') === 'true';
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

    const { found, instructionsChanged } = await updateLocation(id, {
      name,
      instructions,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      logo,
      clearLogo,
    });

    if (!found) {
      return NextResponse.json({ success: false, error: 'Location not found.' }, { status: 404 });
    }

    if (instructionsChanged) {
      try {
        const faqs = await generateFaqsWithGemini(instructions);
        await saveLocationFaqs(id, faqs, 'ok');
      } catch (error) {
        console.error('Failed to regenerate FAQs after instructions edit:', error);
        await saveLocationFaqs(id, [], 'failed');
      }
    }

    return NextResponse.json({ success: true, data: { id, instructionsChanged } });
  } catch (error) {
    console.error('Failed to update location:', error);
    return NextResponse.json({ success: false, error: 'Failed to update location.' }, { status: 500 });
  }
}

// DELETE /api/locations/[id] - remove a location and its generated FAQs (protected).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireVendorAuth())) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteLocation(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Location not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to delete location:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete location.' }, { status: 500 });
  }
}
