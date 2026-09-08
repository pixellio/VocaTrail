/**
 * API Route for Gemini Text Embeddings
 *
 * Keeps the API key secure on the server side. Used to compute semantic
 * similarity between generated AAC concepts and a user's existing cards,
 * so an already-known card is reused instead of creating a duplicate.
 */

import { NextRequest, NextResponse } from 'next/server';

// text-embedding-004 is not available for this API key/project (404s) —
// gemini-embedding-001 is what's actually enabled; verified directly against
// the Gemini API before switching to it.
const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents';

export async function POST(request: NextRequest) {
  try {
    const { texts } = await request.json();

    if (!Array.isArray(texts) || texts.length === 0 || !texts.every((t) => typeof t === 'string')) {
      return NextResponse.json(
        { success: false, error: 'texts must be a non-empty string array' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map((text: string) => ({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text }] },
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini embed API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `Gemini embed API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const embeddings: number[][] | undefined = data?.embeddings?.map(
      (e: { values?: number[] }) => e.values ?? []
    );

    if (!embeddings || embeddings.length !== texts.length) {
      return NextResponse.json(
        { success: false, error: 'Malformed embeddings response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, embeddings });
  } catch (error) {
    console.error('Embed API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to compute embeddings' },
      { status: 500 }
    );
  }
}
