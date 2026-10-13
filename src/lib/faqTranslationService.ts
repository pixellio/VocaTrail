/**
 * Translates a location's (English) FAQ set into another supported language,
 * so the mobile app can fetch FAQs in the user's language. The English set
 * stays the source of truth; translations are cached per (location, language)
 * in location_faq_translations and dropped whenever the English set changes.
 */

import { getLanguageLabel, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/lib/languagePreference';
import {
  getLocationFaqTranslation,
  saveLocationFaqTranslation,
  type LocationFaqQuestion,
} from '@/lib/locationsDatabase';

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export function isSupportedFaqLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

function buildPrompt(faqs: LocationFaqQuestion[], language: string): string {
  const label = getLanguageLabel(language);
  return `Translate these short questions, asked by an AAC (Augmentative and Alternative Communication) user to staff at a venue, from English into ${label}. Use simple, natural, spoken ${label} in its native script. Keep each question short and literal; keep the meaning exactly (especially negations like "not allowed").

For each item also translate "keyPhrase" (a compound noun the question is about) or keep it null. The translated keyPhrase MUST appear verbatim inside the translated "text"; if it cannot, set it to null.

Respond with ONLY JSON: {"questions":[{"text":"...","keyPhrase":"..." or null}]} with exactly ${faqs.length} items in the same order.

Input: ${JSON.stringify({ questions: faqs })}
Output:`;
}

function extractJson(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

// Returns null on any failure (no key, API error, malformed or wrong-length output).
async function translateFaqsWithGemini(
  faqs: LocationFaqQuestion[],
  language: string
): Promise<LocationFaqQuestion[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || faqs.length === 0) return null;

  try {
    const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(faqs, language) }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096, // Indic scripts tokenize heavily
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!response.ok) {
      console.warn('translateFaqs: Gemini API error', response.status);
      return null;
    }
    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== 'string') return null;

    const parsed = JSON.parse(extractJson(raw)) as { questions?: unknown };
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== faqs.length) return null;

    const out: LocationFaqQuestion[] = [];
    for (const item of parsed.questions as Array<{ text?: unknown; keyPhrase?: unknown }>) {
      if (typeof item?.text !== 'string' || !item.text.trim()) return null;
      const text = item.text.trim();
      const kp = typeof item.keyPhrase === 'string' ? item.keyPhrase.trim() : '';
      out.push({ text, keyPhrase: kp && text.includes(kp) ? kp : null });
    }
    return out;
  } catch (error) {
    console.warn('translateFaqs failed:', error);
    return null;
  }
}

// FAQs in `language` for a location: English is returned as-is; other languages
// come from the cache, or are translated once and cached. Falls back to the
// English set (with language 'en') when translation is unavailable, so callers
// can always tell which language they actually received.
export async function getFaqsInLanguage(
  locationId: string,
  englishFaqs: LocationFaqQuestion[],
  language: string
): Promise<{ faqs: LocationFaqQuestion[]; language: string }> {
  if (language === DEFAULT_LANGUAGE || !isSupportedFaqLanguage(language) || englishFaqs.length === 0) {
    return { faqs: englishFaqs, language: DEFAULT_LANGUAGE };
  }

  const cached = await getLocationFaqTranslation(locationId, language);
  if (cached && cached.length === englishFaqs.length) return { faqs: cached, language };

  const translated = await translateFaqsWithGemini(englishFaqs, language);
  if (!translated) return { faqs: englishFaqs, language: DEFAULT_LANGUAGE };

  await saveLocationFaqTranslation(locationId, language, translated);
  return { faqs: translated, language };
}
