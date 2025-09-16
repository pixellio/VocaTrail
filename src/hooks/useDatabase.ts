'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/types';

export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Only initialize in browser environment
        if (typeof window === 'undefined') {
          setIsInitialized(false);
          setIsLoading(false);
          return;
        }

        // Initialize default cards via API
        const response = await fetch('/api/cards');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setIsInitialized(true);
          } else {
            throw new Error(result.error || 'Failed to initialize database');
          }
        } else {
          throw new Error('Failed to connect to database');
        }
      } catch (err) {
        console.error('Database initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Database initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initDatabase();
  }, []);

  // API-based storage service (memoized to prevent infinite re-renders)
  const storageService = useMemo(() => ({
    async getAllCards(): Promise<Card[]> {
      const response = await fetch('/api/cards');
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch cards');
    },

    async addCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card> {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to add card');
    },

    async updateCard(id: number, updates: Partial<Omit<Card, 'id' | 'created_at' | 'updated_at'>>): Promise<Card | null> {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      if (response.status === 404) {
        return null;
      }
      throw new Error(result.error || 'Failed to update card');
    },

    async deleteCard(id: number): Promise<boolean> {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        return true;
      }
      if (response.status === 404) {
        return false;
      }
      throw new Error(result.error || 'Failed to delete card');
    },

    async getCardById(id: number): Promise<Card | null> {
      const response = await fetch(`/api/cards/${id}`);
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      if (response.status === 404) {
        return null;
      }
      throw new Error(result.error || 'Failed to fetch card');
    }
  }), []);

  return {
    isInitialized,
    isLoading,
    error,
    storageService: isInitialized ? storageService : null
  };
}