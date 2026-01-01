/**
 * Dynamic Context Board Generation
 * 
 * This module orchestrates the complete flow for interpreting phrases
 * and generating context-specific AAC boards.
 * 
 * Flow:
 * 1. Try Promotion → Concept Mapping Library (deterministic)
 * 2. If no match → call Gemini AI (with validation)
 * 3. Map concepts to cards (existing or temporary)
 * 4. Generate context board with minimal cognitive load
 */

import { Card, ContextBoard, SemanticInterpretation, AACConcept } from '@/types';
import { findPromotionMatch, validateConcepts } from './promotionMapping';
import { interpretWithGemini, getMockInterpretation } from './geminiService';
import { mapConceptsToCards, getEssentialCommunicationCards } from './conceptToCard';

export interface ContextBoardResult {
  success: boolean;
  board: ContextBoard | null;
  error?: string;
  source: 'library' | 'gemini' | 'fallback' | 'error';
}

/**
 * Main orchestration function: interpret phrase and generate context board
 * 
 * Processing Order (Mandatory):
 * 1. Try Promotion → Concept Mapping Library
 * 2. If no match → call Gemini AI (via server-side API)
 * 3. Validate Gemini output
 * 4. Convert concepts into AAC cards
 * 5. Generate temporary AAC board
 * 
 * @param phrase - The promotional/complex phrase to interpret
 * @param userCards - User's existing vocabulary cards
 * @returns ContextBoardResult with the generated board or error
 */
export async function generateContextBoard(
  phrase: string,
  userCards: Card[]
): Promise<ContextBoardResult> {
  if (!phrase.trim()) {
    return {
      success: false,
      board: null,
      error: 'Please enter a phrase to interpret',
      source: 'error'
    };
  }

  let interpretation: SemanticInterpretation | null = null;
  let source: 'library' | 'gemini' | 'fallback' = 'library';

  // Step 1: Try Promotion → Concept Mapping Library (FIRST - never call Gemini first)
  console.log('🔍 Searching promotion mapping library...');
  interpretation = findPromotionMatch(phrase);

  if (interpretation) {
    console.log('✅ Found match in promotion library:', interpretation);
    source = 'library';
  } else {
    // Step 2: Call Gemini AI via server-side API (only if library fails)
    console.log('📡 No library match, trying Gemini AI...');
    
    interpretation = await interpretWithGemini(phrase);
    
    if (interpretation) {
      console.log('✅ Gemini interpretation successful:', interpretation);
      source = 'gemini';
    } else {
      // Use mock interpretation as final fallback
      console.log('⚠️ Gemini failed, using mock interpretation...');
      interpretation = getMockInterpretation(phrase);
      source = 'fallback';
    }
  }

  // Step 3: Validate interpretation
  if (!interpretation) {
    return {
      success: false,
      board: null,
      error: 'Could not interpret this phrase. Try a different wording or add cards manually.',
      source: 'error'
    };
  }

  if (!validateConcepts(interpretation.concepts)) {
    return {
      success: false,
      board: null,
      error: 'The interpretation failed validation. The phrase may be too complex.',
      source: 'error'
    };
  }

  // Step 4: Convert concepts into AAC cards
  console.log('🃏 Mapping concepts to cards...');
  const contextCards = mapConceptsToCards(interpretation.concepts, userCards);

  // Step 5: Generate context board
  // Include essential communication cards from user's vocabulary
  const essentialCards = getEssentialCommunicationCards(userCards);
  
  // Combine context-specific cards with essential cards (no duplicates)
  const allCards: Card[] = [...contextCards];
  for (const essential of essentialCards) {
    if (!allCards.some(c => c.id === essential.id)) {
      allCards.push(essential);
    }
  }

  // Keep board size minimal to reduce cognitive load
  const MAX_BOARD_SIZE = 12;
  const finalCards = allCards.slice(0, MAX_BOARD_SIZE);

  const board: ContextBoard = {
    id: `ctx_${Date.now()}`,
    name: `Context: ${phrase.slice(0, 30)}${phrase.length > 30 ? '...' : ''}`,
    phrase: phrase,
    interpretation: interpretation,
    cards: finalCards,
    created_at: new Date().toISOString()
  };

  console.log('✅ Context board generated:', board);

  return {
    success: true,
    board,
    source
  };
}

/**
 * Create a simple context board from a list of concepts
 * Useful for programmatic board creation without phrase interpretation
 */
export function createBoardFromConcepts(
  name: string,
  concepts: AACConcept[],
  userCards: Card[]
): ContextBoard {
  const contextCards = mapConceptsToCards(concepts, userCards);

  return {
    id: `ctx_${Date.now()}`,
    name,
    phrase: '',
    interpretation: {
      intent: 'custom',
      concepts,
      source: 'library',
      confidence: 1.0
    },
    cards: contextCards,
    created_at: new Date().toISOString()
  };
}

/**
 * Predefined context boards for common scenarios
 */
export const PREDEFINED_CONTEXTS = {
  shopping: {
    name: '🛒 Shopping',
    concepts: [
      { type: 'action' as const, value: 'buy' },
      { type: 'action' as const, value: 'want' },
      { type: 'item' as const, value: 'item' }
    ]
  },
  restaurant: {
    name: '🍽️ Restaurant',
    concepts: [
      { type: 'action' as const, value: 'want' },
      { type: 'item' as const, value: 'item' },
      { type: 'action' as const, value: 'pay' }
    ]
  },
  help: {
    name: '🆘 Help Needed',
    concepts: [
      { type: 'action' as const, value: 'need' },
      { type: 'benefit' as const, value: 'free' }
    ]
  }
};

/**
 * Generate a predefined context board
 */
export function generatePredefinedBoard(
  contextKey: keyof typeof PREDEFINED_CONTEXTS,
  userCards: Card[]
): ContextBoard {
  const context = PREDEFINED_CONTEXTS[contextKey];
  return createBoardFromConcepts(context.name, context.concepts, userCards);
}

/**
 * Log interpretation for explainability/debugging
 */
export function logInterpretation(
  phrase: string,
  interpretation: SemanticInterpretation | null,
  source: string
): void {
  console.log('═══════════════════════════════════════════');
  console.log('AAC Interpretation Log');
  console.log('═══════════════════════════════════════════');
  console.log(`Input Phrase: "${phrase}"`);
  console.log(`Source: ${source}`);
  
  if (interpretation) {
    console.log(`Intent: ${interpretation.intent}`);
    console.log(`Confidence: ${(interpretation.confidence * 100).toFixed(0)}%`);
    console.log('Concepts:');
    interpretation.concepts.forEach((concept, i) => {
      console.log(`  ${i + 1}. [${concept.type}] ${concept.value}`);
    });
  } else {
    console.log('No interpretation available');
  }
  
  console.log('═══════════════════════════════════════════');
}


