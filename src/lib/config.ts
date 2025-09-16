// Database configuration
export const config = {
  // Use SQL.js as default when no DATABASE_URL is provided
  useSqlJsDefault: process.env.USE_SQLJS_DEFAULT !== 'false',
  
  // Database URL from environment variable
  databaseUrl: process.env.DATABASE_URL,
  
  // Check if we should use SQL.js as default
  shouldUseSqlJs: () => {
    return !process.env.DATABASE_URL || process.env.USE_SQLJS_DEFAULT === 'true';
  }
};
