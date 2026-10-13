import { NextResponse } from 'next/server';
import { getLocationFaqs } from '@/lib/locationsDatabase';
import { getFaqsInLanguage } from '@/lib/faqTranslationService';
import { DEFAULT_LANGUAGE } from '@/lib/languagePreference';

// GET /api/locations/[id]/faqs?lang=si - public lookup used by the mobile AAC app's QR scan flow.
// Mirrors the public GET /api/locations/[id] endpoint: no auth, safe fields only.
// `lang` is optional (default English). The response's `language` says which
// language `faqs` is actually in — English if the requested one is unsupported
// or translation was unavailable.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = (new URL(request.url).searchParams.get('lang') ?? DEFAULT_LANGUAGE).trim().toLowerCase();

  try {
    const stored = await getLocationFaqs(id);
    if (!stored) {
      return NextResponse.json({ success: false, error: 'No FAQs found for this location.' }, { status: 404 });
    }
    const { faqs, language } = await getFaqsInLanguage(id, stored.faqs, lang);
    return NextResponse.json({ success: true, data: { ...stored, faqs, language } });
  } catch (error) {
    console.error('Failed to fetch location FAQs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch location FAQs.' }, { status: 500 });
  }
}
