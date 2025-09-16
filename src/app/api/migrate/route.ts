import { NextRequest, NextResponse } from 'next/server';
import { 
  migrateFromSQLiteToPostgreSQL, 
  migrateFromPostgreSQLToSQLite,
  exportDataToJson,
  importDataFromJson
} from '@/lib/migration';

// POST /api/migrate - Migrate data between databases
export async function POST(request: NextRequest) {
  try {
    const { action, sourcePath, sourceUrl, targetPath, targetUrl } = await request.json();

    let result;

    switch (action) {
      case 'sqlite-to-postgresql':
        if (!sourcePath || !targetUrl) {
          return NextResponse.json(
            { success: false, error: 'Missing sourcePath or targetUrl' },
            { status: 400 }
          );
        }
        result = await migrateFromSQLiteToPostgreSQL(sourcePath, targetUrl);
        break;

      case 'postgresql-to-sqlite':
        if (!sourceUrl || !targetPath) {
          return NextResponse.json(
            { success: false, error: 'Missing sourceUrl or targetPath' },
            { status: 400 }
          );
        }
        result = await migrateFromPostgreSQLToSQLite(sourceUrl, targetPath);
        break;

      case 'export-json':
        result = { success: true, data: await exportDataToJson() };
        break;

      case 'import-json':
        const { cards } = await request.json();
        if (!cards || !Array.isArray(cards)) {
          return NextResponse.json(
            { success: false, error: 'Missing or invalid cards data' },
            { status: 400 }
          );
        }
        result = await importDataFromJson(cards);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Migration failed: ${error}` },
      { status: 500 }
    );
  }
}
