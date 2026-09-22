import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLocationById, saveLocationFaqs } from '@/lib/locationsDatabase';
import { generateFaqsWithGemini } from '@/lib/faqGenerationService';
import { SESSION_COOKIE, getSession, isSuperAdmin } from '@/lib/session';

async function requireVendorAuth() {
  const cookieStore = await cookies();
  const session = getSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return false;
  return session.role === 'vendor' || isSuperAdmin(session.email);
}

// POST /api/locations/[id]/regenerate-faqs - vendor-auth retry for a failed
// (or stale) FAQ generation, without needing a full instructions-edit flow.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireVendorAuth())) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const location = getLocationById(id);
    if (!location) {
      return NextResponse.json({ success: false, error: 'Location not found.' }, { status: 404 });
    }

    const faqs = await generateFaqsWithGemini(location.instructions);
    saveLocationFaqs(id, faqs, 'ok');
    return NextResponse.json({ success: true, data: { locationId: id, faqs } });
  } catch (error) {
    console.error('Failed to regenerate FAQs:', error);
    saveLocationFaqs(id, [], 'failed');
    return NextResponse.json({ success: false, error: 'Failed to regenerate FAQs.' }, { status: 500 });
  }
}
