# VocaTrail Database Configuration

VocaTrail supports both SQLite (default) and PostgreSQL databases with easy migration between them.

## Default Configuration (SQLite)

By default, VocaTrail uses SQLite as the database. No configuration is required.

- **Database File**: `./data/vocatrail.db`
- **No Server Required**: Perfect for development and simple deployments
- **Portable**: Easy to backup and migrate

## PostgreSQL Configuration

To use PostgreSQL, set the `DATABASE_URL` environment variable:

```bash
# .env.local
DATABASE_URL=postgres://username:password@localhost:5432/vocatrail
```

### PostgreSQL Setup

1. **Install PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**:
   ```sql
   CREATE DATABASE vocatrail;
   CREATE USER vocatrail_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE vocatrail TO vocatrail_user;
   ```

3. **Set Environment Variable**:
   ```bash
   export DATABASE_URL=postgres://vocatrail_user:your_password@localhost:5432/vocatrail
   ```

## Migration Between Databases

### Command Line Migration

```bash
# Migrate from SQLite to PostgreSQL
npm run migrate sqlite-to-postgresql ./data/vocatrail.db postgres://user:pass@localhost:5432/vocatrail

# Migrate from PostgreSQL to SQLite
npm run migrate postgresql-to-sqlite postgres://user:pass@localhost:5432/vocatrail ./data/vocatrail.db

# Export data to JSON
npm run migrate export-json ./backup/cards.json

# Import data from JSON
npm run migrate import-json ./backup/cards.json
```

### API Migration

```javascript
// Migrate via API
const response = await fetch('/api/migrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'sqlite-to-postgresql',
    sourcePath: './data/vocatrail.db',
    targetUrl: 'postgres://user:pass@localhost:5432/vocatrail'
  })
});

const result = await response.json();
console.log(result.message);
```

## Database Schema

Both SQLite and PostgreSQL use the same schema:

```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- SERIAL for PostgreSQL
  text TEXT NOT NULL,
  symbol TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- TIMESTAMP for PostgreSQL
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- TIMESTAMP for PostgreSQL
);

CREATE INDEX idx_cards_category ON cards(category);
CREATE INDEX idx_cards_text ON cards(text);
```

## Deployment Options

### 1. SQLite (Simple)
- **Pros**: No server setup, portable, fast
- **Cons**: Single user, no concurrent access
- **Best for**: Development, single-user deployments

### 2. PostgreSQL (Production)
- **Pros**: Multi-user, concurrent access, ACID compliance
- **Cons**: Requires server setup
- **Best for**: Production, multi-user deployments

### 3. Hybrid Approach
- **Development**: SQLite for local development
- **Production**: PostgreSQL for production deployment
- **Migration**: Easy data migration between environments

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `undefined` (uses SQLite) |
| `SQLITE_PATH` | SQLite database file path | `./data/vocatrail.db` |

## Troubleshooting

### SQLite Issues
- Ensure the `data` directory exists and is writable
- Check file permissions on the database file

### PostgreSQL Issues
- Verify connection string format
- Check if PostgreSQL is running
- Ensure database and user exist
- Verify network connectivity

### Migration Issues
- Ensure source database is accessible
- Check target database permissions
- Verify data integrity after migration
