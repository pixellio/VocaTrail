import { NextRequest, NextResponse } from 'next/server';
import { explainWordWithGemini } from '@/lib/wordExplanationService';
import { requireMobileAuth } from '@/lib/mobileAuth';

// POST /api/vocabulary/explain - used by the mobile AAC app as a last-resort
// fallback when a new FAQ word doesn't match anything already on the user's
// board (on-device matching already tried and failed). Requires a logged-in
// mobile user (unlike the public GET /api/locations/[id]/faqs endpoint) —
// this is the endpoint that actually costs real Gemini API calls, so it's
// the one gated behind login; everything else in the app (QR scan, board,
// on-device matching) still works fully anonymously.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireMobileAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Please log in to get word explanations.' },
        { status: 401 }
      );
    }

    const { word, knownWords } = await request.json();

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ success: false, error: 'word is required' }, { status: 400 });
    }
    if (!Array.isArray(knownWords) || !knownWords.every((w) => typeof w === 'string')) {
      return NextResponse.json(
        { success: false, error: 'knownWords must be an array of strings' },
        { status: 400 }
      );
    }

    const result = await explainWordWithGemini(word, knownWords);

    return NextResponse.json({
      success: true,
      data: { word, explanation: result.explanation, usedKnownWords: result.usedKnownWords },
    });
  } catch (error) {
    console.error('Failed to explain word:', error);
    return NextResponse.json({ success: false, error: 'Failed to explain word.' }, { status: 500 });
  }
}
