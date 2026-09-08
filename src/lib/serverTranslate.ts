/**
 * English gloss generation for cross-lingual card matching.
 *
 * Card text is shown and spoken exactly as the user wrote it (any language,
 * including romanized text). But semantic matching (src/lib/semanticMatch.ts)
 * and its lexical fallback (src/lib/conceptToCard.ts) compare against
 * concept text that is always English — so a card written in, say, romanized
 * Sinhala ("Mata ba") never matches an English concept ("can't") on text or
 * embedding similarity alone, since neither operates across languages. This
 * computes a short English gloss once at card create/edit time so both sides
 * of every future match are in the same language.
 */

import { getLanguageLabel } from '@/lib/languagePreference';

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function buildPrompt(text: string, language?: string): string {
  // Short, out-of-context fragments like a 2-word AAC card are easy for the
  // model to misread as broken/misspelled English (e.g. romanized Sinhala
  // "Mata ba" getting guessed as "Look" or "More") unless it's explicitly
  // told to consider romanized regional-language readings first. Verified
  // this instruction is what fixes it — the same prompt without this
  // sentence produces a different wrong guess almost every call.
  const languageHint =
    language && language !== 'en'
      ? ` The user's selected app language is ${getLanguageLabel(language)} — read the text as ${getLanguageLabel(language)} (including short/slang or romanized/transliterated forms) rather than assuming it is misspelled English.`
      : ' The text may already be in English, or it may be a regional/minority language written phonetically in Latin letters without standard spelling conventions (romanized/transliterated Sinhala, Tamil, Hindi, Arabic, etc.) — consider plausible phonetic readings in such languages rather than assuming it is misspelled English.';

  return `Translate the following AAC (Augmentative and Alternative Communication) card text into a short, simple English phrase with the same meaning.${languageHint} If it is already in English, return it unchanged. Respond with ONLY the translated text — no quotes, no explanation, no extra punctuation.

Text: "${text}"
Translation:`;
}

export async function translateToEnglishGloss(text: string, language?: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(trimmed, language) }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 128,
          // This is a few words, not a reasoning task — disable thinking so
          // its token budget doesn't eat into maxOutputTokens (see the
          // MAX_TOKENS truncation bug fixed in /api/interpret this session).
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!response.ok) {
      console.warn('translateToEnglishGloss: Gemini API error', response.status);
      return null;
    }

    const data = await response.json();
    const gloss = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!gloss) return null;

    // Strip surrounding quotes the model sometimes adds despite instructions.
    return gloss.replace(/^["']|["']$/g, '').trim() || null;
  } catch (error) {
    console.warn('translateToEnglishGloss failed:', error);
    return null;
  }
}
