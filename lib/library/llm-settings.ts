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
    metadataExtraction: string;
    imageTextExtraction: string;
  };
}

export function loadLLMSettings(): LLMSettings {
  try {
    const settingsPath = path.join(process.cwd(), '.llm-settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading LLM settings:', error);
  }
  return { providers: [], jobs: { metadataExtraction: '', imageTextExtraction: '' } };
}
