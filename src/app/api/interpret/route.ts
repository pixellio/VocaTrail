/**
 * API Route for Gemini Semantic Interpretation
 * 
 * This keeps the API key secure on the server side
 */

import { NextRequest, NextResponse } from 'next/server';

// Pick a model that actually exists for this API key.
// (Verified via /api/list-models output)
// Good defaults: gemini-2.5-flash (fast) or gemini-2.5-pro (best quality).
const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) semantic interpreter.

Your ONLY task is to convert promotional or complex phrases into structured, AAC-safe concepts.

STRICT RULES:
1. Output ONLY valid JSON - no text before or after
2. Use ONLY these concept types: action, quantity, payment, benefit, item, modifier
3. Use concrete, visualizable values
4. NO sentences, idioms, or abstract language
5. NO emotional or marketing language
6. Quantities must be explicit numbers

OUTPUT FORMAT (JSON only):
{
  "intent": "purchase|information|request",
  "concepts": [
    { "type": "action|quantity|payment|benefit|item|modifier", "value": "string or number" }
  ]
}

EXAMPLES:

Input: "buy one get one free"
Output: {"intent":"purchase","concepts":[{"type":"action","value":"buy"},{"type":"quantity","value":2},{"type":"payment","value":"pay_for_one"},{"type":"benefit","value":"second_item_free"}]}

Input: "20% off all items"
Output: {"intent":"purchase","concepts":[{"type":"benefit","value":"discount"},{"type":"modifier","value":"twenty_percent_off"},{"type":"item","value":"all_items"}]}

Input: "free sample"
Output: {"intent":"purchase","concepts":[{"type":"benefit","value":"free"},{"type":"item","value":"sample"}]}`;

function extractJsonFromGeminiText(text: string): unknown | null {
  // 1) Try fenced blocks: ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  // 2) Try first {...} block
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace?.[0]) {
    try {
      return JSON.parse(brace[0]);
    } catch {
      // continue
    }
  }

  // 3) Try parsing entire text (in case it's pure JSON)
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phrase } = await request.json();

    if (!phrase || typeof phrase !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phrase is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    console.log('🚀 [USING GEMINI-2.5-FLASH] Calling Gemini 2.5 Flash (v1beta) for:', phrase);
    
    // Log masked key to check if it's being read correctly from .env
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
    console.log('🔑 API Key (masked):', maskedKey, 'Length:', apiKey?.length);

    const apiUrl = `${GEMINI_API_BASE}?key=${apiKey}`;
    console.log('🌐 API URL:', GEMINI_API_BASE);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nInput: "${phrase}"\nOutput:`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2000,
          // Ask for JSON output (best effort; model may still return text)
          responseMimeType: 'application/json',
        },
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `Gemini API error: ${response.status}`, details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    // Helpful debug: full response (truncated) for diagnosing schema changes / safety blocks
    console.log('🧾 Gemini full response (truncated):', JSON.stringify(data).slice(0, 2000));

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Empty response from Gemini', details: JSON.stringify(data).slice(0, 2000) },
        { status: 500 }
      );
    }

    console.log('📝 Gemini raw text (truncated):', text.slice(0, 2000));

    const parsed = extractJsonFromGeminiText(text);
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(
        { success: false, error: 'No valid JSON in Gemini response', details: text.slice(0, 2000) },
        { status: 500 }
      );
    }
    const obj = parsed as any;

    return NextResponse.json({
      success: true,
      data: {
        intent: obj.intent,
        concepts: obj.concepts,
        source: 'gemini',
        confidence: 0.75
      }
    });

  } catch (error) {
    console.error('Interpret API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to interpret phrase' },
      { status: 500 }
    );
  }
}

