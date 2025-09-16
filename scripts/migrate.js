#!/usr/bin/env node

const { migrateFromSQLiteToPostgreSQL, migrateFromPostgreSQLToSQLite, exportDataToJson, importDataFromJson } = require('../src/lib/migration');
const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'sqlite-to-postgresql':
        const sqlitePath = args[1];
        const postgresUrl = args[2];
        
        if (!sqlitePath || !postgresUrl) {
          console.error('Usage: node migrate.js sqlite-to-postgresql <sqlite-path> <postgres-url>');
          process.exit(1);
        }

        console.log('Migrating from SQLite to PostgreSQL...');
        const result1 = await migrateFromSQLiteToPostgreSQL(sqlitePath, postgresUrl);
        console.log(result1.message);
        break;

      case 'postgresql-to-sqlite':
        const postgresUrl2 = args[1];
        const sqlitePath2 = args[2];
        
        if (!postgresUrl2 || !sqlitePath2) {
          console.error('Usage: node migrate.js postgresql-to-sqlite <postgres-url> <sqlite-path>');
          process.exit(1);
        }

        console.log('Migrating from PostgreSQL to SQLite...');
        const result2 = await migrateFromPostgreSQLToSQLite(postgresUrl2, sqlitePath2);
        console.log(result2.message);
        break;

      case 'export-json':
        const outputFile = args[1] || './data/export.json';
        
        console.log('Exporting data to JSON...');
        const cards = await exportDataToJson();
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputFile, JSON.stringify(cards, null, 2));
        console.log(`Exported ${cards.length} cards to ${outputFile}`);
        break;

      case 'import-json':
        const inputFile = args[1];
        
        if (!inputFile || !fs.existsSync(inputFile)) {
          console.error('Usage: node migrate.js import-json <json-file>');
          process.exit(1);
        }

        console.log('Importing data from JSON...');
        const cardsData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        const result3 = await importDataFromJson(cardsData);
        console.log(result3.message);
        break;

      default:
        console.log(`
VocaTrail Database Migration Tool

Usage:
  node migrate.js sqlite-to-postgresql <sqlite-path> <postgres-url>
  node migrate.js postgresql-to-sqlite <postgres-url> <sqlite-path>
  node migrate.js export-json [output-file]
  node migrate.js import-json <json-file>

Examples:
  node migrate.js sqlite-to-postgresql ./data/vocatrail.db postgres://user:pass@localhost:5432/vocatrail
  node migrate.js postgresql-to-sqlite postgres://user:pass@localhost:5432/vocatrail ./data/vocatrail.db
  node migrate.js export-json ./backup/cards.json
  node migrate.js import-json ./backup/cards.json
        `);
        break;
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

main();
