/**
 * API Route to List Available Gemini Models
 * 
 * This helps debug which models your API key has access to
 */

import { NextResponse } from 'next/server';

type GeminiModel = {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
};

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY not found in environment variables' },
        { status: 500 }
      );
    }

    console.log('🔍 Fetching available models for your API key...');
    
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
    console.log('🔑 API Key (masked):', maskedKey);

    // Call Google's ListModels endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ListModels API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = (await response.json()) as { models?: GeminiModel[] };
    
    console.log('📋 Available models:');
    if (data.models && Array.isArray(data.models)) {
      data.models.forEach((model) => {
        console.log(`  - ${model.name}`);
        console.log(`    Display Name: ${model.displayName}`);
        console.log(`    Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log('');
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalModels: data.models?.length || 0,
        models: data.models?.map((model) => ({
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          supportedMethods: model.supportedGenerationMethods || [],
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit
        })) || []
      }
    });

  } catch (error) {
    console.error('❌ List models error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list models' },
      { status: 500 }
    );
  }
}

