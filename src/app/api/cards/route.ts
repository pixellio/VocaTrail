import { NextRequest, NextResponse } from 'next/server';
import { databaseAdapter } from '@/lib/database';
import { Card } from '@/types';

// GET /api/cards - Get all cards
export async function GET() {
  try {
    await databaseAdapter.initialize();
    const cards = await databaseAdapter.getAllCards();
    return NextResponse.json({ success: true, data: cards });
  } catch (error) {
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
    return NextResponse.json(
      { success: false, error: 'Failed to create card' },
      { status: 500 }
    );
  }
}
