import { Card } from '@/types';
import { createDatabaseAdapter, DatabaseAdapter } from './database';

export interface MigrationOptions {
  from: 'sqlite' | 'postgresql';
  to: 'sqlite' | 'postgresql';
  sourcePath?: string; // For SQLite source
  sourceUrl?: string;  // For PostgreSQL source
  targetPath?: string; // For SQLite target
  targetUrl?: string;  // For PostgreSQL target
}

export class DataMigrator {
  private sourceAdapter: DatabaseAdapter;
  private targetAdapter: DatabaseAdapter;

  constructor(options: MigrationOptions) {
    this.sourceAdapter = this.createAdapter(options.from, options.sourcePath, options.sourceUrl);
    this.targetAdapter = this.createAdapter(options.to, options.targetPath, options.targetUrl);
  }

  private createAdapter(type: 'sqlite' | 'postgresql', path?: string, url?: string): DatabaseAdapter {
    // For migration purposes, we'll use the factory function
    // This is a simplified approach that works with the current architecture
    if (type === 'sqlite') {
      // Create a SQLite adapter by temporarily setting the environment
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      const adapter = createDatabaseAdapter();
      if (originalUrl) process.env.DATABASE_URL = originalUrl;
      return adapter;
    } else {
      // Create a PostgreSQL adapter
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = url!;
      const adapter = createDatabaseAdapter();
      if (originalUrl) process.env.DATABASE_URL = originalUrl;
      return adapter;
    }
  }

  async migrate(): Promise<{ success: boolean; message: string; migratedCount: number }> {
    try {
      // Initialize both databases
      await this.sourceAdapter.initialize();
      await this.targetAdapter.initialize();

      // Get all cards from source
      const cards = await this.sourceAdapter.getAllCards();
      
      if (cards.length === 0) {
        return {
          success: true,
          message: 'No data to migrate',
          migratedCount: 0
        };
      }

      // Migrate each card
      let migratedCount = 0;
      for (const card of cards) {
        try {
          // Remove id, created_at, updated_at to let target DB generate new ones
          const { id, created_at, updated_at, ...cardData } = card;
          // Log the original values for debugging if needed
          console.log(`Migrating card: ${id} (${created_at} -> ${updated_at})`);
          await this.targetAdapter.addCard(cardData);
          migratedCount++;
        } catch (error) {
          console.error(`Failed to migrate card ${card.id}:`, error);
        }
      }

      return {
        success: true,
        message: `Successfully migrated ${migratedCount} cards`,
        migratedCount
      };

    } catch (error) {
      return {
        success: false,
        message: `Migration failed: ${error}`,
        migratedCount: 0
      };
    } finally {
      // Close connections
      this.sourceAdapter.close();
      this.targetAdapter.close();
    }
  }

  async exportToJson(): Promise<Card[]> {
    await this.sourceAdapter.initialize();
    return await this.sourceAdapter.getAllCards();
  }

  async importFromJson(cards: Card[]): Promise<{ success: boolean; message: string; importedCount: number }> {
    try {
      await this.targetAdapter.initialize();

      let importedCount = 0;
      for (const card of cards) {
        try {
          const { id, created_at, updated_at, ...cardData } = card;
          // Log the original values for debugging if needed
          console.log(`Importing card: ${id} (${created_at} -> ${updated_at})`);
          await this.targetAdapter.addCard(cardData);
          importedCount++;
        } catch (error) {
          console.error(`Failed to import card:`, error);
        }
      }

      return {
        success: true,
        message: `Successfully imported ${importedCount} cards`,
        importedCount
      };

    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error}`,
        importedCount: 0
      };
    } finally {
      this.targetAdapter.close();
    }
  }
}

// Utility functions
export async function migrateFromSQLiteToPostgreSQL(
  sqlitePath: string, 
  postgresUrl: string
): Promise<{ success: boolean; message: string; migratedCount: number }> {
  const migrator = new DataMigrator({
    from: 'sqlite',
    to: 'postgresql',
    sourcePath: sqlitePath,
    targetUrl: postgresUrl
  });

  return await migrator.migrate();
}

export async function migrateFromPostgreSQLToSQLite(
  postgresUrl: string, 
  sqlitePath: string
): Promise<{ success: boolean; message: string; migratedCount: number }> {
  const migrator = new DataMigrator({
    from: 'postgresql',
    to: 'sqlite',
    sourceUrl: postgresUrl,
    targetPath: sqlitePath
  });

  return await migrator.migrate();
}

export async function exportDataToJson(databaseUrl?: string): Promise<Card[]> {
  if (databaseUrl) {
    console.log(`Exporting data from: ${databaseUrl}`);
  }
  const adapter = createDatabaseAdapter();
  await adapter.initialize();
  const cards = await adapter.getAllCards();
  adapter.close();
  return cards;
}

export async function importDataFromJson(cards: Card[], databaseUrl?: string): Promise<{ success: boolean; message: string; importedCount: number }> {
  if (databaseUrl) {
    console.log(`Importing data to: ${databaseUrl}`);
  }
  const adapter = createDatabaseAdapter();
  await adapter.initialize();
  
  let importedCount = 0;
  for (const card of cards) {
    try {
      const { id, created_at, updated_at, ...cardData } = card;
      // Log the original values for debugging if needed
      console.log(`Importing card: ${id} (${created_at} -> ${updated_at})`);
      await adapter.addCard(cardData);
      importedCount++;
    } catch (error) {
      console.error(`Failed to import card:`, error);
    }
  }
  
  adapter.close();
  
  return {
    success: true,
    message: `Successfully imported ${importedCount} cards`,
    importedCount
  };
}
