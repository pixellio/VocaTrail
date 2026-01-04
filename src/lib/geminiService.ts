/**
 * Google Gemini AI Service for Semantic Interpretation
 * 
 * IMPORTANT: This service should ONLY be called when:
 * 1. Promotion phrase is unknown (not in mapping library)
 * 2. Phrase is ambiguous
 * 3. No mapping found with sufficient confidence
 * 
 * Critical LLM Usage Rules:
 * ❗ The LLM must NOT:
 *   - Generate free-form AAC sentences
 *   - Invent vocabulary unrelated to the user's board
 *   - Produce complex grammar or abstract phrasing
 *   - Directly control UI behavior
 * 
 * ✅ The LLM must ONLY:
 *   - Perform semantic decomposition
 *   - Output structured, deterministic JSON
 *   - Use simple, concrete concepts
 */

import { SemanticInterpretation, AACConcept, GeminiConceptResponse } from '@/types';

/**
 * Validate Gemini response against AAC safety rules
 */
function validateGeminiResponse(response: unknown): response is GeminiConceptResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const resp = response as Record<string, unknown>;
  const validTypes = new Set<AACConcept['type']>([
    'action',
    'quantity',
    'payment',
    'benefit',
    'item',
    'modifier',
  ]);

  // Must have intent
  if (typeof resp.intent !== 'string') {
    console.warn('Gemini response missing intent');
    return false;
  }

  // Must have concepts array
  if (!Array.isArray(resp.concepts)) {
    console.warn('Gemini response missing concepts array');
    return false;
  }

  // Validate concepts shape + AAC rules
  const concepts = resp.concepts;
  for (const c of concepts) {
    if (!c || typeof c !== 'object') return false;
    const concept = c as Record<string, unknown>;

    if (typeof concept.type !== 'string' || !validTypes.has(concept.type as AACConcept['type'])) {
      return false;
    }
    const value = concept.value;
    if (typeof value !== 'string' && typeof value !== 'number') {
      return false;
    }
    if (concept.type === 'quantity' && typeof value !== 'number') {
      return false;
    }
    if (value === '') {
      return false;
    }
  }

  // Reject if response contains sentences (basic check)
  const responseStr = JSON.stringify(response);
  if (responseStr.includes('. ') || responseStr.includes('! ')) {
    console.warn('Gemini response contains sentence-like content');
    return false;
  }

  return true;
}

/**
 * Call Gemini API via server-side route for secure API key handling
 * 
 * @param phrase - The phrase to interpret
 * @returns SemanticInterpretation or null if failed
 */
export async function interpretWithGemini(
  phrase: string
): Promise<SemanticInterpretation | null> {
  try {
    console.log('📡 Calling server-side Gemini API...');
    
    const response = await fetch('/api/interpret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phrase })
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Gemini API error:', result.error);
      if (result.details) {
        console.error('Gemini API details (truncated):', String(result.details).slice(0, 2000));
      }
      return null;
    }

    // Log Gemini output for explainability
    console.log('✅ Gemini interpretation:', result.data);

    // Validate the response
    if (!validateGeminiResponse(result.data)) {
      console.warn('Failed to validate Gemini response');
      return null;
    }

    return {
      intent: result.data.intent,
      concepts: result.data.concepts,
      source: 'gemini',
      confidence: result.data.confidence || 0.75
    };

  } catch (error) {
    console.error('Gemini API call failed:', error);
    return null;
  }
}

/**
 * Mock Gemini response for development/testing without API key
 * Uses simple pattern matching as fallback
 */
export function getMockInterpretation(phrase: string): SemanticInterpretation | null {
  const normalizedPhrase = phrase.toLowerCase().trim();

  // Simple pattern-based fallback
  const concepts: AACConcept[] = [];

  // Check for discount percentages
  const percentMatch = normalizedPhrase.match(/(\d+)\s*%\s*off/);
  if (percentMatch) {
    concepts.push({ type: 'benefit', value: 'discount' });
    concepts.push({ type: 'modifier', value: `${percentMatch[1]}_percent_off` });
  }

  // Check for "free" keyword
  if (normalizedPhrase.includes('free')) {
    concepts.push({ type: 'benefit', value: 'free' });
  }

  // Check for "buy" keyword
  if (normalizedPhrase.includes('buy')) {
    concepts.push({ type: 'action', value: 'buy' });
  }

  // Check for numbers
  const numberMatch = normalizedPhrase.match(/(\d+)/);
  if (numberMatch && !percentMatch) {
    concepts.push({ type: 'quantity', value: parseInt(numberMatch[1]) });
  }

  // Check for common items
  if (normalizedPhrase.includes('item') || normalizedPhrase.includes('product')) {
    concepts.push({ type: 'item', value: 'item' });
  }

  if (concepts.length > 0) {
    return {
      intent: 'purchase',
      concepts,
      source: 'gemini', // Mark as gemini for consistency
      confidence: 0.5 // Lower confidence for mock
    };
  }

  return null;
}


