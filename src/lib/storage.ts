import { Card } from '@/types';

class StorageService {
  private dbName = 'VocaTrailDB';
  private version = 1;
  private storeName = 'cards';
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      throw new Error('Storage can only be initialized in browser environment');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create cards store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('text', 'text', { unique: false });
        }
      };
    });
  }

  async getAllCards(): Promise<Card[]> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get cards'));
      };
    });
  }

  async addCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card> {
    await this.ensureInitialized();
    
    const newCard: Card = {
      ...card,
      id: Date.now(), // Simple ID generation
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(newCard);

      request.onsuccess = () => {
        resolve(newCard);
      };

      request.onerror = () => {
        reject(new Error('Failed to add card'));
      };
    });
  }

  async updateCard(id: number, updates: Partial<Omit<Card, 'id' | 'created_at' | 'updated_at'>>): Promise<Card | null> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingCard = getRequest.result;
        if (!existingCard) {
          resolve(null);
          return;
        }

        const updatedCard: Card = {
          ...existingCard,
          ...updates,
          updated_at: new Date().toISOString()
        };

        const putRequest = store.put(updatedCard);
        putRequest.onsuccess = () => {
          resolve(updatedCard);
        };
        putRequest.onerror = () => {
          reject(new Error('Failed to update card'));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get card for update'));
      };
    });
  }

  async deleteCard(id: number): Promise<boolean> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('Failed to delete card'));
      };
    });
  }

  async getCardById(id: number): Promise<Card | null> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get card'));
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Create a singleton instance
export const storageService = new StorageService();

// Initialize default cards if storage is empty
export async function initializeDefaultCards(): Promise<void> {
  const cards = await storageService.getAllCards();
  
  if (cards.length === 0) {
    const defaultCards = [
      { text: 'Hello', symbol: '👋', category: 'Greetings', color: '#FFE4E1' },
      { text: 'Please', symbol: '🙏', category: 'Politeness', color: '#E1F5FE' },
      { text: 'Thank you', symbol: '❤️', category: 'Politeness', color: '#E8F5E8' },
      { text: 'Water', symbol: '💧', category: 'Needs', color: '#E3F2FD' },
      { text: 'Food', symbol: '🍎', category: 'Needs', color: '#FFF3E0' },
      { text: 'Help', symbol: '🆘', category: 'Emergency', color: '#FFEBEE' },
      { text: 'Yes', symbol: '✅', category: 'Responses', color: '#E8F5E8' },
      { text: 'No', symbol: '❌', category: 'Responses', color: '#FFEBEE' },
      // Questions (WH-)
      { text: 'Who', symbol: '👤', category: 'Question', color: '#E3F2FD' },
      { text: 'What', symbol: '❓', category: 'Question', color: '#FFF3E0' },
      { text: 'Where', symbol: '📍', category: 'Question', color: '#E8F5E8' },
      { text: 'When', symbol: '🕙', category: 'Question', color: '#F3E5F5' },
      { text: 'Why', symbol: '🤷', category: 'Question', color: '#FFEBEE' },
      { text: 'How', symbol: '🔧', category: 'Question', color: '#E0F2F1' },
    ];

    for (const card of defaultCards) {
      await storageService.addCard(card);
    }
  }
}