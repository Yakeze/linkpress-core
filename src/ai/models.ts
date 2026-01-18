import type { AIProvider, ModelInfo } from '../types.js';

export const FALLBACK_MODELS: Record<AIProvider, ModelInfo[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
  ],
  openai: [
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
  ],
  gemini: [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  ],
};

export async function fetchModels(provider: AIProvider, apiKey: string): Promise<ModelInfo[]> {
  try {
    switch (provider) {
      case 'anthropic':
        return await fetchAnthropicModels(apiKey);
      case 'openai':
        return await fetchOpenAIModels(apiKey);
      case 'gemini':
        return await fetchGeminiModels(apiKey);
      default:
        return [];
    }
  } catch {
    return [];
  }
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json() as { data: Array<{ id: string; display_name: string }> };

  return data.data
    .filter(m => m.id.includes('claude') && !m.id.includes('instant'))
    .map(m => ({ id: m.id, name: m.display_name || m.id }));
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json() as { data: Array<{ id: string }> };

  const validPrefixes = ['gpt-4', 'gpt-5', 'o1', 'o3', 'o4'];
  const excludePatterns = ['realtime', 'audio', 'vision', 'instruct', 'turbo', 'preview'];

  return data.data
    .filter(m => {
      const id = m.id.toLowerCase();
      const hasValidPrefix = validPrefixes.some(p => id.startsWith(p));
      const hasExcluded = excludePatterns.some(p => id.includes(p));
      return hasValidPrefix && !hasExcluded;
    })
    .map(m => ({ id: m.id, name: m.id }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json() as { models: Array<{ name: string; displayName: string; supportedGenerationMethods: string[] }> };

  return data.models
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .filter(m => m.name.includes('gemini'))
    .map(m => ({
      id: m.name.replace('models/', ''),
      name: m.displayName || m.name.replace('models/', ''),
    }))
    .sort((a, b) => {
      const aVersion = a.id.match(/\d+(\.\d+)?/)?.[0] || '0';
      const bVersion = b.id.match(/\d+(\.\d+)?/)?.[0] || '0';
      return parseFloat(bVersion) - parseFloat(aVersion);
    });
}
