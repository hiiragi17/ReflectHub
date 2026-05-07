import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns';
import { getOpenAIClient, OPENAI_MODEL, ANALYSIS_VERSION } from '@/lib/openai/client';
import {
  SUMMARY_SYSTEM_PROMPT,
  buildSummaryUserPrompt,
  parseSummaryPayload,
  type BuildSummaryPromptInput,
} from '@/lib/openai/summaryPrompt';
import { validateOutputForLeaks } from '@/lib/openai/security';
import type {
  OpenAISummaryPayload,
  SummaryError,
  SummaryMetadata,
  SummaryPeriod,
} from '@/types/summary';

// 期間サマリーは投入トークンが大きく頻度が低いため、24h ローリングで 2 回までを推奨。
export const DAILY_RATE_LIMIT = 2;

export interface PeriodRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export function resolvePeriodRange(
  period: SummaryPeriod,
  reference: Date = new Date(),
): PeriodRange {
  let start: Date;
  let end: Date;
  switch (period) {
    case 'week':
      // 月曜始まり。タイムゾーン依存を避けるため日付のみで扱う。
      start = startOfWeek(reference, { weekStartsOn: 1 });
      end = endOfWeek(reference, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(reference);
      end = endOfMonth(reference);
      break;
    case 'quarter':
      start = startOfQuarter(reference);
      end = endOfQuarter(reference);
      break;
  }
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export async function callOpenAISummary(
  input: BuildSummaryPromptInput,
): Promise<{ payload: OpenAISummaryPayload; metadata: SummaryMetadata }> {
  const client = getOpenAIClient();
  const { prompt: userPrompt, detectedInjections } = buildSummaryUserPrompt(input);

  if (detectedInjections.length > 0) {
    // 検知した jailbreak/インジェクションパターンは観測のためログに残す。
    // ブロックは行わない（誤検知時の UX 影響を避けるため、サニタイズ済みで送信する）。
    console.warn(
      '[ai-summary] potential prompt injection patterns detected in user input:',
      detectedInjections.join(', '),
    );
  }

  let response;
  try {
    response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1400,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI 呼び出しに失敗しました';
    const wrapped: SummaryError = { code: 'OPENAI_ERROR', message };
    throw wrapped;
  }

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw {
      code: 'OPENAI_ERROR',
      message: 'AI から空のレスポンスが返却されました。',
    } satisfies SummaryError;
  }

  // 出力検証: 機密情報や system プロンプトの漏洩を検出した場合は
  // クライアントへ生応答を返さず、エラーで打ち切る。
  const validation = validateOutputForLeaks(content, SUMMARY_SYSTEM_PROMPT);
  if (!validation.ok) {
    console.warn(
      '[ai-summary] output validation rejected response:',
      validation.risks.join(', '),
    );
    throw {
      code: 'OPENAI_ERROR',
      message: 'AI 応答に不適切な情報が含まれていたため破棄しました。',
    } satisfies SummaryError;
  }

  let payload: OpenAISummaryPayload;
  try {
    payload = parseSummaryPayload(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI レスポンスの解析に失敗しました。';
    throw { code: 'OPENAI_ERROR', message } satisfies SummaryError;
  }

  const metadata: SummaryMetadata = {
    tokens_used: response.usage?.total_tokens ?? 0,
    model: response.model ?? OPENAI_MODEL,
    version: ANALYSIS_VERSION,
  };

  return { payload, metadata };
}

export const aiSummaryService = {
  callOpenAISummary,
  resolvePeriodRange,
};
