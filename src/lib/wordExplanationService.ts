/**
 * Server-side Gemini call that explains a single new AAC vocabulary word in
 * 2-3 simple words, preferring words the user already has on their board
 * (passed in as `knownWords`) so the explanation teaches by association
 * instead of introducing more unfamiliar text. Used by the mobile app only
 * as a last-resort fallback, after on-device matching against the user's
 * existing cards has already failed to find anything.
 * Follows the same direct-fetch/JSON-extraction pattern as faqGenerationService.ts.
 */

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) vocabulary explainer.

Your ONLY task is to explain one word in 2-3 very simple words, so a nonverbal person who may not
read fluently can learn it by association with words they already know.

STRICT RULES:
1. Output ONLY valid JSON - no text before or after
2. The explanation must be 2-3 simple, concrete words - no full sentences, no punctuation
3. Prefer words from the provided "known words" list when a reasonable one fits
4. If no known word fits well, use simple, common, everyday words instead - never invent
   abstract or complex vocabulary
5. NO idioms, NO abstract language, NO marketing language
6. usedKnownWords must list exactly which of the provided known words (if any) you used

OUTPUT FORMAT (JSON only):
{
  "explanation": "string",
  "usedKnownWords": ["string", ...]
}

EXAMPLE:

Input word: "exchange"
Known words: ["give", "take", "bathroom", "yes", "you", "want"]
Output: {"explanation":"give and take","usedKnownWords":["give","take"]}`;

function extractJsonFromGeminiText(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  const brace = text.match(/\{[\s\S]*\}/);
  if (brace?.[0]) {
    try {
      return JSON.parse(brace[0]);
    } catch {
      // continue
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface WordExplanationResult {
  explanation: string;
  usedKnownWords: string[];
}

function isWordExplanationResponse(value: unknown): value is WordExplanationResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.explanation === 'string' &&
    v.explanation.trim().length > 0 &&
    Array.isArray(v.usedKnownWords) &&
    v.usedKnownWords.every((w) => typeof w === 'string')
  );
}

export async function explainWordWithGemini(
  word: string,
  knownWords: string[]
): Promise<WordExplanationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const apiUrl = `${GEMINI_API_BASE}?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nInput word: "${word}"\nKnown words: ${JSON.stringify(
                knownWords
              )}\nOutput:`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 256,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  const parsed = extractJsonFromGeminiText(text);
  if (!isWordExplanationResponse(parsed)) {
    throw new Error('No valid Gemini JSON in response');
  }

  return parsed;
}
