# Database Deployment Guide

## Database Behavior by Environment

### Local Development
- **Database**: SQLite file (`./data/vocatrail.db`)
- **Persistence**: Data is saved to disk
- **Fallback**: If SQLite fails, falls back to in-memory database

### Vercel Production
- **Database**: In-memory database
- **Persistence**: Data is lost between function invocations
- **Behavior**: Each API call starts with default cards
- **Note**: This is expected behavior for serverless functions

### With PostgreSQL
- **Database**: PostgreSQL (when `DATABASE_URL` is set)
- **Persistence**: Data is permanently stored
- **Setup**: Configure `DATABASE_URL` environment variable in Vercel

## Environment Variables

### For PostgreSQL (Recommended for Production)
```bash
DATABASE_URL=postgres://username:password@host:port/database
```

### For Vercel Detection
Vercel automatically sets `VERCEL=1` environment variable, which triggers in-memory database mode.

## Database Adapters

1. **PostgreSQLAdapter**: For production with persistent storage
2. **SQLiteAdapter**: For local development with file storage
3. **InMemoryAdapter**: For Vercel/serverless environments

## Migration

To migrate from in-memory to PostgreSQL:

1. Set up a PostgreSQL database (e.g., using Vercel Postgres, Supabase, or Railway)
2. Set the `DATABASE_URL` environment variable in Vercel
3. Redeploy the application

The app will automatically detect the PostgreSQL URL and switch to persistent storage.

## Default Cards

All database adapters initialize with the same default cards:
- Hello (👋) - Greetings
- Please (🙏) - Politeness  
- Thank you (❤️) - Politeness
- Water (💧) - Needs
- Food (🍎) - Needs
- Help (🆘) - Emergency
- Yes (✅) - Responses
- No (❌) - Responses
