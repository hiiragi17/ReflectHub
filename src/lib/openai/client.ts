import OpenAI from 'openai';

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
export const ANALYSIS_VERSION = '1.0.0';

// テスト用にキャッシュをクリア
export function _resetOpenAIClient(): void {
  cachedClient = null;
}
