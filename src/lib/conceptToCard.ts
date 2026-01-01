/**
 * Concept-to-Card Mapping Logic
 * 
 * This module handles the conversion of semantic concepts into AAC cards.
 * 
 * Processing:
 * 1. Search user's existing vocabulary board
 * 2. If found → reuse existing card
 * 3. If missing → create temporary AAC card
 * 
 * Temporary cards must:
 * - Be visually concrete
 * - Use simple text (e.g., "2 items", "Pay for 1")
 * - Be marked temporary = true
 * - Not saved permanently unless approved later
 */

import { Card, AACConcept, TemporaryCard, ConceptType } from '@/types';

// Symbol mappings for different concept types and values
const CONCEPT_SYMBOLS: Record<string, Record<string, string>> = {
  action: {
    buy: '🛒',
    get: '📦',
    pay: '💳',
    take: '✋',
    give: '🤲',
    want: '🙋',
    need: '❗',
    default: '▶️'
  },
  quantity: {
    1: '1️⃣',
    2: '2️⃣',
    3: '3️⃣',
    4: '4️⃣',
    5: '5️⃣',
    6: '6️⃣',
    7: '7️⃣',
    8: '8️⃣',
    9: '9️⃣',
    10: '🔟',
    default: '#️⃣'
  },
  payment: {
    pay_for_one: '💰1',
    pay_for_two: '💰2',
    pay_one_and_half: '💰½',
    pay_less: '💵⬇️',
    no_payment: '🚫💰',
    default: '💳'
  },
  benefit: {
    free: '🆓',
    discount: '🏷️',
    second_item_free: '2️⃣🆓',
    third_item_free: '3️⃣🆓',
    second_item_discount: '2️⃣🏷️',
    big_discount: '🏷️🏷️',
    bigger_discount: '🏷️📈',
    default: '⭐'
  },
  item: {
    item: '📦',
    product: '🏷️',
    shipping: '🚚',
    gift: '🎁',
    sample: '🧪',
    all_items: '📦📦',
    default: '📦'
  },
  modifier: {
    half_price: '½💰',
    quarter_off: '¼🏷️',
    limited_time: '⏰',
    more: '➕',
    second: '2️⃣',
    extra: '➕',
    default: '🔹'
  }
};

// Color mappings for different concept types
const CONCEPT_COLORS: Record<ConceptType, string> = {
  action: '#E3F2FD',      // Light blue
  quantity: '#FFF3E0',    // Light orange
  payment: '#E8F5E9',     // Light green
  benefit: '#FCE4EC',     // Light pink
  item: '#F3E5F5',        // Light purple
  modifier: '#FFFDE7'     // Light yellow
};

// Text templates for concept values
const CONCEPT_TEXT_TEMPLATES: Record<string, Record<string, string>> = {
  action: {
    buy: 'Buy',
    get: 'Get',
    pay: 'Pay',
    take: 'Take',
    give: 'Give',
    want: 'I want',
    need: 'I need'
  },
  payment: {
    pay_for_one: 'Pay for 1',
    pay_for_two: 'Pay for 2',
    pay_one_and_half: 'Pay 1½',
    pay_less: 'Pay less',
    no_payment: 'No payment'
  },
  benefit: {
    free: 'Free',
    discount: 'Discount',
    second_item_free: '2nd free',
    third_item_free: '3rd free',
    second_item_discount: '2nd discount',
    big_discount: 'Big sale',
    bigger_discount: 'More savings'
  },
  item: {
    item: 'Item',
    product: 'Product',
    shipping: 'Shipping',
    gift: 'Gift',
    sample: 'Sample',
    all_items: 'All items'
  },
  modifier: {
    half_price: 'Half price',
    quarter_off: '25% off',
    limited_time: 'Limited time',
    more: 'More',
    second: 'Second',
    extra: 'Extra',
    twenty_percent_off: '20% off'
  }
};

/**
 * Get symbol for a concept
 */
function getSymbolForConcept(concept: AACConcept): string {
  const typeSymbols = CONCEPT_SYMBOLS[concept.type];
  if (!typeSymbols) return '❓';

  const valueStr = String(concept.value);
  return typeSymbols[valueStr] || typeSymbols['default'] || '❓';
}

/**
 * Get display text for a concept
 */
function getTextForConcept(concept: AACConcept): string {
  // For quantity, always show the number with "items"
  if (concept.type === 'quantity') {
    const num = typeof concept.value === 'number' ? concept.value : parseInt(String(concept.value));
    return `${num} item${num !== 1 ? 's' : ''}`;
  }

  const typeTemplates = CONCEPT_TEXT_TEMPLATES[concept.type];
  if (typeTemplates) {
    const template = typeTemplates[String(concept.value)];
    if (template) return template;
  }

  // Fallback: convert value to title case
  const valueStr = String(concept.value);
  return valueStr
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Search user's vocabulary for matching card
 */
function findMatchingCard(concept: AACConcept, userCards: Card[]): Card | null {
  const conceptText = getTextForConcept(concept).toLowerCase();
  
  for (const card of userCards) {
    const cardText = card.text.toLowerCase();
    
    // Exact match
    if (cardText === conceptText) {
      return card;
    }

    // Check if card matches the concept value
    const valueStr = String(concept.value).toLowerCase().replace(/_/g, ' ');
    if (cardText === valueStr || cardText.includes(valueStr)) {
      return card;
    }
  }

  // Special mappings for common user cards
  const commonMappings: Record<string, string[]> = {
    'buy': ['buy', 'purchase', 'shop', 'get'],
    'want': ['want', 'i want', 'need', 'i need'],
    'free': ['free', 'no cost', 'nothing'],
    'pay': ['pay', 'money', 'cost'],
    'yes': ['yes', 'ok', 'okay', 'agree'],
    'no': ['no', 'not', 'nope', 'disagree']
  };

  const valueStr = String(concept.value).toLowerCase();
  const mappings = commonMappings[valueStr];
  
  if (mappings) {
    for (const card of userCards) {
      const cardText = card.text.toLowerCase();
      if (mappings.includes(cardText)) {
        return card;
      }
    }
  }

  return null;
}

/**
 * Create a temporary AAC card for a concept
 */
function createTemporaryCard(concept: AACConcept, tempId: number): TemporaryCard {
  return {
    id: tempId,
    text: getTextForConcept(concept),
    symbol: getSymbolForConcept(concept),
    category: concept.type.charAt(0).toUpperCase() + concept.type.slice(1),
    color: CONCEPT_COLORS[concept.type],
    temporary: true,
    concept_type: concept.type,
    concept_value: concept.value
  };
}

/**
 * Map concepts to AAC cards
 * 
 * For each concept:
 * 1. Search user's existing vocabulary board
 * 2. If found → reuse existing card
 * 3. If missing → create temporary AAC card
 * 
 * @param concepts - Array of semantic concepts
 * @param userCards - User's existing vocabulary cards
 * @returns Array of cards (mix of existing and temporary)
 */
export function mapConceptsToCards(
  concepts: AACConcept[],
  userCards: Card[]
): Card[] {
  const resultCards: Card[] = [];
  let tempIdCounter = -1; // Negative IDs for temporary cards

  for (const concept of concepts) {
    // Try to find matching card in user's vocabulary
    const existingCard = findMatchingCard(concept, userCards);

    if (existingCard) {
      // Reuse existing card (don't duplicate if already in result)
      if (!resultCards.some(c => c.id === existingCard.id)) {
        resultCards.push(existingCard);
      }
    } else {
      // Create temporary card
      const tempCard = createTemporaryCard(concept, tempIdCounter--);
      resultCards.push(tempCard);
    }
  }

  return resultCards;
}

/**
 * Generate a set of essential communication cards to accompany context cards
 * These help users construct complete messages
 */
export function getEssentialCommunicationCards(userCards: Card[]): Card[] {
  const essentialConcepts = ['I want', 'Please', 'Thank you', 'Yes', 'No', 'Help'];
  const result: Card[] = [];

  for (const essential of essentialConcepts) {
    const match = userCards.find(
      card => card.text.toLowerCase() === essential.toLowerCase()
    );
    if (match) {
      result.push(match);
    }
  }

  return result;
}

/**
 * Check if a card is temporary
 */
export function isTemporaryCard(card: Card): card is TemporaryCard {
  return card.temporary === true;
}

/**
 * Convert temporary card to permanent card format
 * (ready to be saved to user's vocabulary)
 */
export function convertToPermanentCard(
  tempCard: TemporaryCard
): Omit<Card, 'id' | 'created_at' | 'updated_at'> {
  return {
    text: tempCard.text,
    symbol: tempCard.symbol,
    category: tempCard.category,
    color: tempCard.color
  };
}


