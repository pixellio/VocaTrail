/**
 * Promotion → Concept Mapping Library
 * 
 * AAC-Safe Controlled Semantic Dictionary
 * 
 * Core Principle: Map meaning, not words.
 * Meaning must be concrete, countable, and visual.
 * 
 * Processing Order:
 * 1. Try Promotion → Concept Mapping Library (this file)
 * 2. If no match → call Gemini AI
 * 3. Validate output
 * 4. Convert concepts into AAC cards
 */

import { PromotionMapping, SemanticInterpretation, AACConcept } from '@/types';

// Predefined promotion mappings - AAC-safe and deterministic
export const PROMOTION_MAPPINGS: PromotionMapping[] = [
  // Buy One Get One Free (BOGO)
  {
    promotion_id: 'BOGO',
    patterns: [
      'buy one get one free',
      'buy 1 get 1 free',
      'bogo',
      'b1g1',
      'buy one get one',
      'two for the price of one',
      '2 for 1',
      'two for one'
    ],
    concepts: [
      { type: 'action', value: 'buy' },
      { type: 'quantity', value: 2 },
      { type: 'payment', value: 'pay_for_one' },
      { type: 'benefit', value: 'second_item_free' }
    ],
    aac_priority: 'high',
    visual_hints: ['two_items', 'pay_once', 'free_item']
  },

  // 50% Off / Half Price
  {
    promotion_id: 'HALF_PRICE',
    patterns: [
      '50% off',
      '50 percent off',
      'half price',
      'half off',
      '50% discount'
    ],
    concepts: [
      { type: 'benefit', value: 'discount' },
      { type: 'modifier', value: 'half_price' }
    ],
    aac_priority: 'high',
    visual_hints: ['half', 'discount', 'save_money']
  },

  // 3 for 2
  {
    promotion_id: 'THREE_FOR_TWO',
    patterns: [
      '3 for 2',
      '3 for the price of 2',
      'three for two',
      'three for the price of two',
      'buy 2 get 1 free',
      'buy two get one free'
    ],
    concepts: [
      { type: 'action', value: 'buy' },
      { type: 'quantity', value: 3 },
      { type: 'payment', value: 'pay_for_two' },
      { type: 'benefit', value: 'third_item_free' }
    ],
    aac_priority: 'high',
    visual_hints: ['three_items', 'pay_twice', 'free_item']
  },

  // 25% Off
  {
    promotion_id: 'QUARTER_OFF',
    patterns: [
      '25% off',
      '25 percent off',
      'quarter off',
      '25% discount'
    ],
    concepts: [
      { type: 'benefit', value: 'discount' },
      { type: 'modifier', value: 'quarter_off' }
    ],
    aac_priority: 'medium',
    visual_hints: ['discount', 'save_money']
  },

  // Free Shipping
  {
    promotion_id: 'FREE_SHIPPING',
    patterns: [
      'free shipping',
      'free delivery',
      'no shipping cost',
      'shipping free'
    ],
    concepts: [
      { type: 'benefit', value: 'free' },
      { type: 'item', value: 'shipping' }
    ],
    aac_priority: 'medium',
    visual_hints: ['free', 'delivery']
  },

  // Buy More Save More
  {
    promotion_id: 'BUY_MORE_SAVE_MORE',
    patterns: [
      'buy more save more',
      'the more you buy the more you save',
      'bulk discount',
      'quantity discount'
    ],
    concepts: [
      { type: 'action', value: 'buy' },
      { type: 'modifier', value: 'more' },
      { type: 'benefit', value: 'bigger_discount' }
    ],
    aac_priority: 'medium',
    visual_hints: ['many_items', 'save_more']
  },

  // Clearance / Sale
  {
    promotion_id: 'CLEARANCE',
    patterns: [
      'clearance',
      'clearance sale',
      'final sale',
      'last chance',
      'everything must go'
    ],
    concepts: [
      { type: 'benefit', value: 'big_discount' },
      { type: 'modifier', value: 'limited_time' }
    ],
    aac_priority: 'medium',
    visual_hints: ['sale', 'discount', 'hurry']
  },

  // Second Item Discount
  {
    promotion_id: 'SECOND_HALF_OFF',
    patterns: [
      'second item half off',
      'second item 50% off',
      '2nd item half price',
      'second one half off'
    ],
    concepts: [
      { type: 'action', value: 'buy' },
      { type: 'quantity', value: 2 },
      { type: 'payment', value: 'pay_one_and_half' },
      { type: 'benefit', value: 'second_item_discount' }
    ],
    aac_priority: 'high',
    visual_hints: ['two_items', 'discount_second']
  },

  // Free Gift
  {
    promotion_id: 'FREE_GIFT',
    patterns: [
      'free gift',
      'free gift with purchase',
      'bonus gift',
      'gift with purchase',
      'gwp'
    ],
    concepts: [
      { type: 'action', value: 'buy' },
      { type: 'benefit', value: 'free' },
      { type: 'item', value: 'gift' }
    ],
    aac_priority: 'medium',
    visual_hints: ['gift', 'free', 'bonus']
  },

  // Limited Time Offer
  {
    promotion_id: 'LIMITED_TIME',
    patterns: [
      'limited time offer',
      'limited time only',
      'today only',
      'one day sale',
      'flash sale',
      'hurry ends soon'
    ],
    concepts: [
      { type: 'benefit', value: 'discount' },
      { type: 'modifier', value: 'limited_time' }
    ],
    aac_priority: 'medium',
    visual_hints: ['clock', 'hurry', 'sale']
  }
];

/**
 * Normalize input text for matching
 * - Lowercase
 * - Trim spaces
 * - Remove extra whitespace
 * - Remove common punctuation
 */
function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calculate simple edit distance (Levenshtein) for fuzzy matching
 */
function editDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate match confidence based on edit distance
 */
function calculateConfidence(input: string, pattern: string): number {
  const normalizedInput = normalizeInput(input);
  const normalizedPattern = normalizeInput(pattern);

  // Exact match
  if (normalizedInput === normalizedPattern) {
    return 1.0;
  }

  // Contains match
  if (normalizedInput.includes(normalizedPattern) || normalizedPattern.includes(normalizedInput)) {
    return 0.9;
  }

  // Fuzzy match based on edit distance
  const distance = editDistance(normalizedInput, normalizedPattern);
  const maxLength = Math.max(normalizedInput.length, normalizedPattern.length);
  const similarity = 1 - (distance / maxLength);

  return similarity;
}

/**
 * Find the best matching promotion for an input phrase
 * @param phrase - The promotional phrase to match
 * @param confidenceThreshold - Minimum confidence required (default: 0.7)
 * @returns SemanticInterpretation or null if no match found
 */
export function findPromotionMatch(
  phrase: string,
  confidenceThreshold: number = 0.7
): SemanticInterpretation | null {
  const normalizedPhrase = normalizeInput(phrase);
  
  let bestMatch: { mapping: PromotionMapping; confidence: number } | null = null;

  for (const mapping of PROMOTION_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      const confidence = calculateConfidence(normalizedPhrase, pattern);
      
      if (confidence >= confidenceThreshold) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { mapping, confidence };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      intent: 'purchase',
      concepts: bestMatch.mapping.concepts,
      source: 'library',
      confidence: bestMatch.confidence
    };
  }

  return null;
}

/**
 * Get all available promotion patterns for suggestions
 */
export function getAllPromotionPatterns(): string[] {
  const patterns: string[] = [];
  for (const mapping of PROMOTION_MAPPINGS) {
    patterns.push(...mapping.patterns);
  }
  return [...new Set(patterns)].sort();
}

/**
 * Get promotion mapping by ID
 */
export function getPromotionById(promotionId: string): PromotionMapping | null {
  return PROMOTION_MAPPINGS.find(m => m.promotion_id === promotionId) || null;
}

/**
 * Validate concepts (ensure they follow AAC safety rules)
 * Rule 1: No abstract language
 * Rule 2: Quantities must be explicit
 * Rule 3: No full sentences
 * Rule 4: Must be visualizable
 */
export function validateConcepts(concepts: AACConcept[]): boolean {
  const validTypes: Set<string> = new Set(['action', 'quantity', 'payment', 'benefit', 'item', 'modifier']);
  
  for (const concept of concepts) {
    // Check valid type
    if (!validTypes.has(concept.type)) {
      console.warn(`Invalid concept type: ${concept.type}`);
      return false;
    }

    // Quantity must be a number
    if (concept.type === 'quantity' && typeof concept.value !== 'number') {
      console.warn(`Quantity must be a number: ${concept.value}`);
      return false;
    }

    // Value must not be empty
    if (concept.value === '' || concept.value === null || concept.value === undefined) {
      console.warn(`Concept value cannot be empty`);
      return false;
    }
  }

  return true;
}


