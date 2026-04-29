import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  callOpenAI,
  DAILY_RATE_LIMIT,
  getRateLimitWindow,
} from '@/services/aiAnalysisService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import type { AnalysisError, AnalysisResponse } from '@/types/analysis';

interface RawBody {
  reflection_id?: unknown;
}

function errorResponse(error: AnalysisError, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  let body: RawBody;
  try {
    body = (await request.json()) as RawBody;
  } catch {
    return errorResponse(
      { code: 'INVALID_REQUEST', message: 'リクエストボディが不正です。' },
      400,
    );
  }

  const reflectionId =
    typeof body?.reflection_id === 'string' ? body.reflection_id.trim() : '';
  if (!reflectionId) {
    return errorResponse(
      { code: 'INVALID_REQUEST', message: 'reflection_id は必須です。' },
      400,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse({ code: 'UNAUTHORIZED', message: '認証が必要です。' }, 401);
  }

  // レート制限チェック (24h ローリング)
  const { start: windowStart, end: windowEnd } = getRateLimitWindow();
  const { count: usedCount, error: countError } = await supabase
    .from('ai_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart.toISOString());

  if (countError) {
    return errorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'レート制限の確認に失敗しました。',
      },
      500,
    );
  }

  const used = usedCount ?? 0;
  if (used >= DAILY_RATE_LIMIT) {
    const resetAt = new Date(windowEnd.getTime() + 24 * 60 * 60 * 1000).toISOString();
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: `1 日に分析できる上限 (${DAILY_RATE_LIMIT} 回) に達しました。`,
          retry_after: 24 * 60 * 60,
        } satisfies AnalysisError,
        rate_limit: {
          remaining: 0,
          limit: DAILY_RATE_LIMIT,
          reset_at: resetAt,
        },
      },
      { status: 429 },
    );
  }

  // 振り返りを取得（RLS により本人のもののみ取得可能）
  const { data: reflectionRow, error: reflectionError } = await supabase
    .from('retrospectives')
    .select('*')
    .eq('id', reflectionId)
    .eq('user_id', user.id)
    .single();

  if (reflectionError || !reflectionRow) {
    return errorResponse(
      { code: 'NOT_FOUND', message: '対象の振り返りが見つかりません。' },
      404,
    );
  }

  const reflection = reflectionRow as Reflection;

  // フレームワーク情報を取得（プロンプトの精度向上のため）
  let framework: Framework | undefined;
  if (reflection.framework_id) {
    const { data: frameworkRow } = await supabase
      .from('frameworks')
      .select('*')
      .eq('id', reflection.framework_id)
      .single();
    framework = (frameworkRow as Framework | null) ?? undefined;
  }

  // OpenAI 呼び出し
  let payload, metadata;
  try {
    const result = await callOpenAI(reflection, framework);
    payload = result.payload;
    metadata = result.metadata;
  } catch (err) {
    const wrapped = err as AnalysisError;
    if (wrapped?.code === 'OPENAI_ERROR') {
      return errorResponse(wrapped, 502);
    }
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析の実行に失敗しました。' },
      500,
    );
  }

  // DB 保存
  const { data: inserted, error: insertError } = await supabase
    .from('ai_analyses')
    .insert({
      user_id: user.id,
      reflection_id: reflection.id,
      growth_points: payload.growth_points,
      improvement_suggestions: payload.improvement_suggestions,
      emotional_trend: payload.emotional_trend,
      key_achievements: payload.key_achievements,
      challenges: payload.challenges,
      recommendations: payload.recommendations,
      metadata,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return errorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: '分析結果の保存に失敗しました。',
      },
      500,
    );
  }

  const responsePayload: AnalysisResponse = {
    analysis: inserted as AnalysisResponse['analysis'],
    rate_limit: {
      remaining: Math.max(0, DAILY_RATE_LIMIT - (used + 1)),
      limit: DAILY_RATE_LIMIT,
      reset_at: new Date(windowEnd.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };

  return NextResponse.json(responsePayload, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse({ code: 'UNAUTHORIZED', message: '認証が必要です。' }, 401);
  }

  const reflectionId = request.nextUrl.searchParams.get('reflection_id');
  if (!reflectionId) {
    return errorResponse(
      { code: 'INVALID_REQUEST', message: 'reflection_id は必須です。' },
      400,
    );
  }

  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('reflection_id', reflectionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析結果の取得に失敗しました。' },
      500,
    );
  }

  return NextResponse.json({ analysis: data ?? null });
}
