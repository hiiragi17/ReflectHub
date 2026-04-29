import { getOpenAIClient, OPENAI_MODEL, ANALYSIS_VERSION } from '@/lib/openai/client';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseAnalysisPayload,
} from '@/lib/openai/prompt';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import type {
  Analysis,
  AnalysisError,
  AnalysisMetadata,
  OpenAIAnalysisPayload,
} from '@/types/analysis';

export const DAILY_RATE_LIMIT = 1;

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset_at: string;
  used: number;
}

export function getRateLimitWindow(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  // 24 時間ローリングウィンドウ
  const end = now;
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

function buildAnalysis(
  payload: OpenAIAnalysisPayload,
  metadata: AnalysisMetadata,
): Omit<Analysis, 'id' | 'user_id' | 'reflection_id' | 'created_at' | 'updated_at'> {
  return {
    growth_points: payload.growth_points,
    improvement_suggestions: payload.improvement_suggestions,
    emotional_trend: payload.emotional_trend,
    key_achievements: payload.key_achievements,
    challenges: payload.challenges,
    recommendations: payload.recommendations,
    metadata,
  };
}

export async function callOpenAI(
  reflection: Reflection,
  framework: Framework | undefined,
): Promise<{ payload: OpenAIAnalysisPayload; metadata: AnalysisMetadata }> {
  const client = getOpenAIClient();
  const userPrompt = buildUserPrompt(reflection, framework);

  let response;
  try {
    response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI 呼び出しに失敗しました';
    const wrapped: AnalysisError = { code: 'OPENAI_ERROR', message };
    throw wrapped;
  }

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw {
      code: 'OPENAI_ERROR',
      message: 'AI から空のレスポンスが返却されました。',
    } satisfies AnalysisError;
  }

  let payload: OpenAIAnalysisPayload;
  try {
    payload = parseAnalysisPayload(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI レスポンスの解析に失敗しました。';
    throw { code: 'OPENAI_ERROR', message } satisfies AnalysisError;
  }

  const metadata: AnalysisMetadata = {
    tokens_used: response.usage?.total_tokens ?? 0,
    model: response.model ?? OPENAI_MODEL,
    version: ANALYSIS_VERSION,
  };

  return { payload, metadata };
}

export const aiAnalysisService = {
  callOpenAI,
  buildAnalysis,
  getRateLimitWindow,
};
