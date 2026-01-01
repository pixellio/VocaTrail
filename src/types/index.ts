export interface Card {
  id: number;
  text: string;
  symbol: string;
  category: string;
  color: string;
  created_at?: string;
  updated_at?: string;
  temporary?: boolean; // Marks cards as temporary (not persisted)
}

// AAC Concept Types (from ins_mapping.md)
export type ConceptType = 'action' | 'quantity' | 'payment' | 'benefit' | 'item' | 'modifier';

export interface AACConcept {
  type: ConceptType;
  value: string | number;
}

export interface PromotionMapping {
  promotion_id: string;
  patterns: string[];
  concepts: AACConcept[];
  aac_priority: 'high' | 'medium' | 'low';
  visual_hints: string[];
}

export interface SemanticInterpretation {
  intent: string;
  concepts: AACConcept[];
  source: 'library' | 'gemini';
  confidence: number;
}

// Temporary Card for dynamic context boards
export interface TemporaryCard extends Card {
  temporary: true;
  concept_type: ConceptType;
  concept_value: string | number;
}

// Context Board for promotions
export interface ContextBoard {
  id: string;
  name: string;
  phrase: string;
  interpretation: SemanticInterpretation;
  cards: Card[];
  created_at: string;
}

// Gemini API Response Schema
export interface GeminiConceptResponse {
  intent: string;
  concepts: AACConcept[];
}
