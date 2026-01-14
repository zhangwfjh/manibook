import fs from 'fs';
import path from 'path';
import { LLMSettings } from '../types';

export function loadLLMSettings(): LLMSettings {
  try {
    const settingsPath = path.join(process.cwd(), 'settings', 'llm.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading LLM settings:', error);
  }
  return { providers: [], jobs: { metadataExtraction: '', imageTextExtraction: '' } };
}