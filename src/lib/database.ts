import { Card } from '@/types';
import Database from 'better-sqlite3';
import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseAdapter {
  initialize(): Promise<void>;
  getAllCards(): Promise<Card[]>;
  addCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card>;
  updateCard(id: number, updates: Partial<Omit<Card, 'id' | 'created_at' | 'updated_at'>>): Promise<Card | null>;
  deleteCard(id: number): Promise<boolean>;
  getCardById(id: number): Promise<Card | null>;
  close(): void;
}

// SQLite Implementation
class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = './data/vocatrail.db') {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    
    // Create cards table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        symbol TEXT NOT NULL,
        category TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category);
      CREATE INDEX IF NOT EXISTS idx_cards_text ON cards(text);
    `);
  }

  async getAllCards(): Promise<Card[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM cards ORDER BY created_at DESC');
    return stmt.all() as Card[];
  }

  async addCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT INTO cards (text, symbol, category, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(card.text, card.symbol, card.category, card.color);
    
    return {
      ...card,
      id: result.lastInsertRowid as number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async updateCard(id: number, updates: Partial<Omit<Card, 'id' | 'created_at' | 'updated_at'>>): Promise<Card | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const existingCard = await this.getCardById(id);
    if (!existingCard) return null;

    const updatedCard = { ...existingCard, ...updates };
    
    const stmt = this.db.prepare(`
      UPDATE cards 
      SET text = ?, symbol = ?, category = ?, color = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(updatedCard.text, updatedCard.symbol, updatedCard.category, updatedCard.color, id);
    
    return {
      ...updatedCard,
      updated_at: new Date().toISOString()
    };
  }

  async deleteCard(id: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('DELETE FROM cards WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  async getCardById(id: number): Promise<Card | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM cards WHERE id = ?');
    const card = stmt.get(id) as Card | undefined;
    
    return card || null;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// PostgreSQL Implementation
class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async initialize(): Promise<void> {
    if (this.client) return;

    this.client = await this.pool!.connect();
    
    // Create cards table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        symbol TEXT NOT NULL,
        category TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.client.query(`
      CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category);
      CREATE INDEX IF NOT EXISTS idx_cards_text ON cards(text);
    `);
  }

  async getAllCards(): Promise<Card[]> {
    if (!this.client) throw new Error('Database not initialized');
    
    const result = await this.client.query('SELECT * FROM cards ORDER BY created_at DESC');
    return result.rows as Card[];
  }

  async addCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card> {
    if (!this.client) throw new Error('Database not initialized');
    
    const result = await this.client.query(`
      INSERT INTO cards (text, symbol, category, color, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [card.text, card.symbol, card.category, card.color]);
    
    return result.rows[0] as Card;
  }

  async updateCard(id: number, updates: Partial<Omit<Card, 'id' | 'created_at' | 'updated_at'>>): Promise<Card | null> {
    if (!this.client) throw new Error('Database not initialized');
    
    const existingCard = await this.getCardById(id);
    if (!existingCard) return null;

    const updatedCard = { ...existingCard, ...updates };
    
    const result = await this.client.query(`
      UPDATE cards 
      SET text = $1, symbol = $2, category = $3, color = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [updatedCard.text, updatedCard.symbol, updatedCard.category, updatedCard.color, id]);
    
    return result.rows[0] as Card;
  }

  async deleteCard(id: number): Promise<boolean> {
    if (!this.client) throw new Error('Database not initialized');
    
    const result = await this.client.query('DELETE FROM cards WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getCardById(id: number): Promise<Card | null> {
    if (!this.client) throw new Error('Database not initialized');
    
    const result = await this.client.query('SELECT * FROM cards WHERE id = $1', [id]);
    return result.rows[0] as Card || null;
  }

  close(): void {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    if (this.pool) {
      this.pool.end();
      this.pool = null;
    }
  }
}

// Database Factory
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && databaseUrl.startsWith('postgres://')) {
    console.log('Using PostgreSQL database');
    return new PostgreSQLAdapter(databaseUrl);
  } else {
    console.log('Using SQLite database (default)');
    return new SQLiteAdapter();
  }
}

// Singleton instance
export const databaseAdapter = createDatabaseAdapter();

// Initialize default cards
export async function initializeDefaultCards(): Promise<void> {
  const cards = await databaseAdapter.getAllCards();
  
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
    ];

    for (const card of defaultCards) {
      await databaseAdapter.addCard(card);
    }
  }
}
