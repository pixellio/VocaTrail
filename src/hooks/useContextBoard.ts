'use client';

import { useState, useCallback } from 'react';
import { Card, ContextBoard } from '@/types';
import { generateContextBoard, ContextBoardResult, logInterpretation } from '@/lib/contextBoard';
import { getAllPromotionPatterns } from '@/lib/promotionMapping';
import { isTemporaryCard, convertToPermanentCard } from '@/lib/conceptToCard';
import { parseLocationPayload, resolvePhraseFromPayload, resolveLocationById, LocationPayload } from '@/lib/locationContext';

export interface UseContextBoardReturn {
  // State
  contextBoard: ContextBoard | null;
  isProcessing: boolean;
  error: string | null;
  interpretationSource: 'library' | 'gemini' | 'fallback' | null;
  locationInfo: LocationPayload | null;

  // Actions
  interpretPhrase: (phrase: string, userCards: Card[], language?: string) => Promise<void>;
  scanLocationPayload: (raw: string, userCards: Card[], language?: string) => Promise<void>;
  clearContextBoard: () => void;
  saveTemporaryCard: (card: Card, onSave: (card: Omit<Card, 'id' | 'created_at' | 'updated_at'>) => Promise<Card>) => Promise<Card | null>;

  // Helpers
  getSuggestions: () => string[];
}

/**
 * React hook for managing AAC context boards
 * 
 * Provides functionality to:
 * - Interpret promotional phrases
 * - Generate context-specific card boards
 * - Save temporary cards to user vocabulary
 */
export function useContextBoard(): UseContextBoardReturn {
  const [contextBoard, setContextBoard] = useState<ContextBoard | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretationSource, setInterpretationSource] = useState<'library' | 'gemini' | 'fallback' | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationPayload | null>(null);

  /**
   * Shared runner behind both interpretPhrase and scanLocationPayload: takes
   * a resolved phrase and drives it through the same library → Gemini →
   * fallback pipeline.
   */
  const runInterpretation = useCallback(async (phrase: string, userCards: Card[], language?: string) => {
    setIsProcessing(true);
    setError(null);
    setInterpretationSource(null);

    try {
      const result: ContextBoardResult = await generateContextBoard(
        phrase,
        userCards,
        language
      );

      if (result.success && result.board) {
        setContextBoard(result.board);
        setInterpretationSource(result.source === 'error' ? null : result.source);

        // Log for explainability
        logInterpretation(phrase, result.board.interpretation, result.source);
      } else {
        setError(result.error || 'Failed to interpret phrase');
        setContextBoard(null);
      }
    } catch (err) {
      console.error('Context board generation failed:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setContextBoard(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Interpret a phrase and generate context board
   */
  const interpretPhrase = useCallback(async (phrase: string, userCards: Card[], language?: string) => {
    setLocationInfo(null);
    await runInterpretation(phrase, userCards, language);
  }, [runInterpretation]);

  /**
   * Interpret a scanned QR payload and generate a location-based context
   * board. A location QR normally just contains a registered location ID —
   * try resolving that first; if it isn't a known location, fall back to
   * parsing the raw scan as inline JSON/plain text (manual-paste path).
   */
  const scanLocationPayload = useCallback(async (raw: string, userCards: Card[], language?: string) => {
    const trimmed = raw.trim();
    const resolved = await resolveLocationById(trimmed);
    const payload = resolved ?? parseLocationPayload(trimmed);
    setLocationInfo(payload);

    const phrase = resolvePhraseFromPayload(payload);
    if (!phrase.trim()) {
      setError('QR code did not contain any usable instructions or phrase.');
      return;
    }

    await runInterpretation(phrase, userCards, language);
  }, [runInterpretation]);

  /**
   * Clear the current context board
   */
  const clearContextBoard = useCallback(() => {
    setContextBoard(null);
    setError(null);
    setInterpretationSource(null);
    setLocationInfo(null);
  }, []);

  /**
   * Save a temporary card to user's permanent vocabulary
   */
  const saveTemporaryCard = useCallback(async (
    card: Card,
    onSave: (card: Omit<Card, 'id' | 'created_at' | 'updated_at'>) => Promise<Card>
  ): Promise<Card | null> => {
    if (!isTemporaryCard(card)) {
      console.warn('Card is not temporary, nothing to save');
      return null;
    }

    try {
      const permanentCard = convertToPermanentCard(card);
      const savedCard = await onSave(permanentCard);
      
      // Update context board to replace temporary card with saved one
      if (contextBoard) {
        setContextBoard({
          ...contextBoard,
          cards: contextBoard.cards.map(c => 
            c.id === card.id ? savedCard : c
          )
        });
      }

      return savedCard;
    } catch (err) {
      console.error('Failed to save temporary card:', err);
      return null;
    }
  }, [contextBoard]);

  /**
   * Get promotion pattern suggestions for autocomplete
   */
  const getSuggestions = useCallback(() => {
    return getAllPromotionPatterns();
  }, []);

  return {
    contextBoard,
    isProcessing,
    error,
    interpretationSource,
    locationInfo,
    interpretPhrase,
    scanLocationPayload,
    clearContextBoard,
    saveTemporaryCard,
    getSuggestions
  };
}


