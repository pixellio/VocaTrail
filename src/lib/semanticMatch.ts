/**
 * Semantic Card Matching
 *
 * Upgrades card lookup from exact/substring text matching to embedding-based
 * similarity, so a generated concept ("doctor") reuses an existing card that
 * means the same thing ("Doctor", "See doctor") instead of duplicating it.
 *
 * Falls back to null (caller falls back to lexical matching) whenever the
 * embedding API is unavailable, consistent with this codebase's existing
 * library → Gemini → fallback cascade.
 */

import { Card } from '@/types';

// Calibrated empirically against gemini-embedding-001 (the model actually
// available for this API key — text-embedding-004 404s and was never
// reachable). Cosine similarity on short AAC-card-length text doesn't
// cleanly separate "same meaning" from "same domain": e.g. "Yes"/"No"
// scored 0.667 despite being opposites, while legitimate matches like
// "Help"/"I need help" scored 0.699 and "Water"/"I want water" scored
// 0.765. 0.68 sits just above the highest false-positive observed and
// below the lowest true match observed in that calibration.
export const SEMANTIC_MATCH_THRESHOLD = 0.68;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length !== a.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedTexts(texts: string[]): Promise<number[][] | null> {
  try {
    const response = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });

    const result = await response.json();
    if (!result.success) {
      console.warn('Embedding request failed:', result.error);
      return null;
    }
    return result.embeddings as number[][];
  } catch (error) {
    console.warn('Embedding request failed:', error);
    return null;
  }
}

/**
 * For each candidate text, find the best-matching user card by semantic
 * similarity (cosine similarity of embeddings above SEMANTIC_MATCH_THRESHOLD).
 *
 * Returns null (not an array of nulls) if embeddings could not be computed at
 * all, so callers know to fall back to lexical matching entirely.
 */
export async function findSemanticMatches(
  candidateTexts: string[],
  userCards: Card[]
): Promise<(Card | null)[] | null> {
  if (candidateTexts.length === 0) return [];
  if (userCards.length === 0) return candidateTexts.map(() => null);

  // Prefer each card's English gloss (src/lib/serverTranslate.ts) over its
  // raw text — concept text is always English, so comparing gloss-to-gloss
  // is what makes a non-English card (e.g. romanized Sinhala) matchable at
  // all. Cards without a gloss yet (not re-saved since this was added) fall
  // back to raw text, same as before.
  const cardTexts = userCards.map((card) => card.translation_en || card.text);
  const embeddings = await embedTexts([...candidateTexts, ...cardTexts]);
  if (!embeddings) return null;

  const candidateEmbeddings = embeddings.slice(0, candidateTexts.length);
  const cardEmbeddings = embeddings.slice(candidateTexts.length);

  return candidateEmbeddings.map((candidateEmbedding) => {
    let best: { card: Card; score: number } | null = null;

    cardEmbeddings.forEach((cardEmbedding, i) => {
      const score = cosineSimilarity(candidateEmbedding, cardEmbedding);
      if (score >= SEMANTIC_MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { card: userCards[i], score };
      }
    });

    return best ? (best as { card: Card; score: number }).card : null;
  });
}
