import { NextRequest, NextResponse } from 'next/server';
import { databaseAdapter, initializeDefaultCards } from '@/lib/database';

// GET /api/cards - Get all cards
export async function GET() {
  try {
    await databaseAdapter.initialize();
    let cards = await databaseAdapter.getAllCards();

    // Seed defaults on empty DB (new installs)
    if (cards.length === 0) {
      await initializeDefaultCards();
      cards = await databaseAdapter.getAllCards();
    }
    return NextResponse.json({ success: true, data: cards });
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

// POST /api/cards - Create a new card
export async function POST(request: NextRequest) {
  try {
    const cardData = await request.json();
    const { text, symbol, category, color } = cardData;

    if (!text || !symbol || !category || !color) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await databaseAdapter.initialize();
    const newCard = await databaseAdapter.addCard({ text, symbol, category, color });
    
    return NextResponse.json({ success: true, data: newCard }, { status: 201 });
  } catch (error) {
    console.error('Failed to create card:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create card' },
      { status: 500 }
    );
  }
}
