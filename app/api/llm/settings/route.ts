import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface LLMProvider {
  name: string;
  type: 'OpenAI' | 'Ollama';
  model: string;
  baseURL: string;
  apiKey?: string;
}

interface LLMSettings {
  providers: LLMProvider[];
  jobs: {
    metadataExtraction: string; // provider name
    imageTextExtraction: string; // provider name
  };
}

// Load settings from JSON file (simulating .env storage)
function loadLLMSettings(): LLMSettings {
  try {
    const settingsPath = path.join(process.cwd(), 'settings/llm.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading LLM settings:', error);
  }
  return { providers: [], jobs: { metadataExtraction: '', imageTextExtraction: '' } };
}

// Save settings to JSON file
function saveLLMSettings(settings: LLMSettings): void {
  try {
    const settingsPath = path.join(process.cwd(), 'settings/llm.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('LLM settings saved');
  } catch (error) {
    console.error('Error saving LLM settings:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const settings = loadLLMSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error getting LLM settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: LLMSettings = await request.json();

    // Validate settings structure
    if (!settings.providers || !Array.isArray(settings.providers) || !settings.jobs) {
      return NextResponse.json({ error: 'Invalid settings structure' }, { status: 400 });
    }

    // Validate that assigned jobs reference existing providers
    const providerNames = settings.providers.map(p => p.name);
    if (settings.jobs.metadataExtraction && !providerNames.includes(settings.jobs.metadataExtraction)) {
      return NextResponse.json({ error: 'Invalid metadata extraction provider' }, { status: 400 });
    }
    if (settings.jobs.imageTextExtraction && !providerNames.includes(settings.jobs.imageTextExtraction)) {
      return NextResponse.json({ error: 'Invalid image text extraction provider' }, { status: 400 });
    }

    saveLLMSettings(settings);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving LLM settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
