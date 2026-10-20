import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  callOpenAISummary,
  DAILY_RATE_LIMIT,
  MIN_REFLECTIONS_FOR_SUMMARY,
  resolvePeriodRange,
} from '@/services/aiSummaryService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import type {
  Summary,
  SummaryError,
  SummaryPeriod,
  SummaryResponse,
} from '@/types/summary';

interface RawBody {
  period?: unknown;
}

interface ReservationRow {
  reservation_id: string | null;
  used: number | null;
  next_available_at: string | null;
  duplicate: boolean | null;
}

const WINDOW_HOURS = 24;
const RESERVATION_LEASE_SECONDS = 300;

const ALLOWED_PERIODS: SummaryPeriod[] = ['week', 'month', 'quarter'];

function isValidPeriod(value: unknown): value is SummaryPeriod {
  return typeof value === 'string' && ALLOWED_PERIODS.includes(value as SummaryPeriod);
}

function errorResponse(error: SummaryError, status: number) {
  return NextResponse.json({ error }, { status });
}

function fallbackResetAt(): string {
  return new Date(Date.now() + WINDOW_HOURS * 60 * 60 * 1000).toISOString();
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

  if (!isValidPeriod(body?.period)) {
    return errorResponse(
      {
        code: 'INVALID_REQUEST',
        message: 'period は week / month / quarter のいずれかを指定してください。',
      },
      400,
    );
  }
  const period: SummaryPeriod = body.period;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse({ code: 'UNAUTHORIZED', message: '認証が必要です。' }, 401);
  }

  const range = resolvePeriodRange(period);

  // 期間内の振り返りを取得（RLS で本人のもののみ）
  const { data: reflectionRows, error: reflectionError } = await supabase
    .from('retrospectives')
    .select('*')
    .eq('user_id', user.id)
    .gte('reflection_date', range.start)
    .lte('reflection_date', range.end)
    .order('reflection_date', { ascending: true });

  if (reflectionError) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '振り返りの取得に失敗しました。' },
      500,
    );
  }

  const reflections = (reflectionRows ?? []) as Reflection[];

  if (reflections.length === 0) {
    return errorResponse(
      {
        code: 'NO_REFLECTIONS',
        message: '対象期間に振り返りがありません。先に振り返りを記録してください。',
      },
      404,
    );
  }

  if (reflections.length < MIN_REFLECTIONS_FOR_SUMMARY) {
    return errorResponse(
      {
        code: 'INSUFFICIENT_REFLECTIONS',
        message: `期間サマリー分析には ${MIN_REFLECTIONS_FOR_SUMMARY} 件以上の振り返りが必要です（現在 ${reflections.length} 件）。あと ${MIN_REFLECTIONS_FOR_SUMMARY - reflections.length} 件記録すると分析できます。`,
        required: MIN_REFLECTIONS_FOR_SUMMARY,
        current: reflections.length,
      },
      422,
    );
  }

  // スロット予約 RPC（24h ローリング + 同一期間連続生成の禁止）
  const { data: reservationRows, error: reserveError } = await supabase.rpc(
    'reserve_ai_summary_slot',
    {
      p_period: period,
      p_period_start: range.start,
      p_period_end: range.end,
      p_max_per_window: DAILY_RATE_LIMIT,
      p_window_hours: WINDOW_HOURS,
      p_lease_seconds: RESERVATION_LEASE_SECONDS,
    },
  );

  if (reserveError) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'レート制限の確認に失敗しました。' },
      500,
    );
  }

  const reservation: ReservationRow | undefined = Array.isArray(reservationRows)
    ? (reservationRows[0] as ReservationRow | undefined)
    : (reservationRows as ReservationRow | undefined);

  if (!reservation) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'スロット予約の応答が空でした。' },
      500,
    );
  }

  if (reservation.duplicate) {
    return errorResponse(
      {
        code: 'DUPLICATE_PERIOD',
        message: '同じ期間のサマリーを直前に生成しています。少し時間をおいてください。',
      },
      409,
    );
  }

  if (!reservation.reservation_id) {
    const resetAt = reservation.next_available_at ?? fallbackResetAt();
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: `1 日に生成できる上限 (${DAILY_RATE_LIMIT} 回) に達しました。`,
          retry_after: Math.max(
            0,
            Math.floor((new Date(resetAt).getTime() - Date.now()) / 1000),
          ),
        } satisfies SummaryError,
        rate_limit: {
          remaining: 0,
          limit: DAILY_RATE_LIMIT,
          reset_at: resetAt,
        },
      },
      { status: 429 },
    );
  }

  const reservationId = reservation.reservation_id;

  // プロンプトに使うフレームワーク情報をまとめて取得
  const frameworkIds = Array.from(
    new Set(reflections.map((r) => r.framework_id).filter(Boolean)),
  );
  const frameworksById: Record<string, Framework | undefined> = {};
  if (frameworkIds.length > 0) {
    const { data: frameworkRows } = await supabase
      .from('frameworks')
      .select('*')
      .in('id', frameworkIds);
    for (const row of (frameworkRows ?? []) as Framework[]) {
      frameworksById[row.id] = row;
    }
  }

  let payload, metadata;
  try {
    const result = await callOpenAISummary({
      period,
      periodStart: range.start,
      periodEnd: range.end,
      reflections,
      frameworksById,
    });
    payload = result.payload;
    metadata = result.metadata;
  } catch (err) {
    await supabase.rpc('release_ai_summary_slot', {
      p_reservation_id: reservationId,
    });
    const wrapped = err as SummaryError;
    if (wrapped?.code === 'OPENAI_ERROR') {
      return errorResponse(wrapped, 502);
    }
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析の実行に失敗しました。' },
      500,
    );
  }

  const { data: completedRow, error: completeError } = await supabase.rpc(
    'complete_ai_summary',
    {
      p_reservation_id: reservationId,
      p_reflection_count: reflections.length,
      p_recurring_themes: payload.recurring_themes,
      p_sustained_practices: payload.sustained_practices,
      p_emerging_challenges: payload.emerging_challenges,
      p_growth_summary: payload.growth_summary,
      p_mood_trend: payload.mood_trend,
      p_recommendations: payload.recommendations,
      p_metadata: metadata,
    },
  );

  if (completeError || !completedRow) {
    await supabase.rpc('release_ai_summary_slot', {
      p_reservation_id: reservationId,
    });
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析結果の保存に失敗しました。' },
      500,
    );
  }

  const completed = (
    Array.isArray(completedRow) ? completedRow[0] : completedRow
  ) as Summary;

  const used = reservation.used ?? 1;
  const responsePayload: SummaryResponse = {
    summary: completed,
    rate_limit: {
      remaining: Math.max(0, DAILY_RATE_LIMIT - used),
      limit: DAILY_RATE_LIMIT,
      reset_at: reservation.next_available_at ?? fallbackResetAt(),
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

  const periodParam = request.nextUrl.searchParams.get('period');
  if (!isValidPeriod(periodParam)) {
    return errorResponse(
      {
        code: 'INVALID_REQUEST',
        message: 'period は week / month / quarter のいずれかを指定してください。',
      },
      400,
    );
  }
  const period: SummaryPeriod = periodParam;
  const range = resolvePeriodRange(period);

  const { data, error } = await supabase
    .from('ai_summaries')
    .select('*')
    .eq('user_id', user.id)
    .eq('period', period)
    .eq('period_start', range.start)
    .eq('is_complete', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析結果の取得に失敗しました。' },
      500,
    );
  }

  // 対象期間の振り返り件数を取得（行は不要なので head + count のみ）。
  // クライアントが「あと何件で分析できるか」を事前判定するために使う。
  const { count, error: countError } = await supabase
    .from('retrospectives')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('reflection_date', range.start)
    .lte('reflection_date', range.end);

  if (countError) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '振り返り件数の取得に失敗しました。' },
      500,
    );
  }

  return NextResponse.json({
    summary: data ?? null,
    reflection_count: count ?? 0,
    min_required: MIN_REFLECTIONS_FOR_SUMMARY,
    period_start: range.start,
    period_end: range.end,
  });
}
