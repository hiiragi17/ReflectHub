import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI, DAILY_RATE_LIMIT } from '@/services/aiAnalysisService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import type { AnalysisError, AnalysisResponse } from '@/types/analysis';

interface RawBody {
  reflection_id?: unknown;
}

interface ReservationRow {
  reservation_id: string | null;
  used: number;
  oldest_in_window: string | null;
}

const WINDOW_HOURS = 24;

function errorResponse(error: AnalysisError, status: number) {
  return NextResponse.json({ error }, { status });
}

function computeResetAt(oldestInWindow: string | null): string {
  // ローリング 24h ウィンドウ内で最古のエントリが期限切れになる時刻が、次の解放時刻。
  // 該当エントリが無ければ「今から 24h 後」をフォールバック値として返す。
  const base = oldestInWindow ? new Date(oldestInWindow) : new Date();
  return new Date(base.getTime() + WINDOW_HOURS * 60 * 60 * 1000).toISOString();
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

  // 振り返りを取得（RLS により本人のもののみ）。OpenAI 呼び出し前にここで存在確認することで、
  // 他人の reflection_id ではスロットを予約させない。
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

  // 原子的にスロットを予約。pg_advisory_xact_lock + count + insert を 1 トランザクションで行う。
  const { data: reservationRows, error: reserveError } = await supabase.rpc(
    'reserve_ai_analysis_slot',
    {
      p_reflection_id: reflection.id,
      p_max_per_window: DAILY_RATE_LIMIT,
      p_window_hours: WINDOW_HOURS,
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

  if (!reservation.reservation_id) {
    const resetAt = computeResetAt(reservation.oldest_in_window);
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: `1 日に分析できる上限 (${DAILY_RATE_LIMIT} 回) に達しました。`,
          retry_after: Math.max(
            0,
            Math.floor((new Date(resetAt).getTime() - Date.now()) / 1000),
          ),
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

  const reservationId = reservation.reservation_id;

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
    // 失敗時は予約行をロールバック（DELETE）してスロットを解放
    await supabase.from('ai_analyses').delete().eq('id', reservationId);

    const wrapped = err as AnalysisError;
    if (wrapped?.code === 'OPENAI_ERROR') {
      return errorResponse(wrapped, 502);
    }
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析の実行に失敗しました。' },
      500,
    );
  }

  // 成功: 予約行を分析結果で UPDATE して is_complete=true にする
  const { data: updated, error: updateError } = await supabase
    .from('ai_analyses')
    .update({
      growth_points: payload.growth_points,
      improvement_suggestions: payload.improvement_suggestions,
      emotional_trend: payload.emotional_trend,
      key_achievements: payload.key_achievements,
      challenges: payload.challenges,
      recommendations: payload.recommendations,
      metadata,
      is_complete: true,
    })
    .eq('id', reservationId)
    .select()
    .single();

  if (updateError || !updated) {
    // UPDATE に失敗した場合も予約行を残しておくと永久に枠を消費するので削除
    await supabase.from('ai_analyses').delete().eq('id', reservationId);
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析結果の保存に失敗しました。' },
      500,
    );
  }

  const responsePayload: AnalysisResponse = {
    analysis: updated as AnalysisResponse['analysis'],
    rate_limit: {
      remaining: Math.max(0, DAILY_RATE_LIMIT - reservation.used),
      limit: DAILY_RATE_LIMIT,
      reset_at: computeResetAt(reservation.oldest_in_window),
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

  // 完了済みの分析のみ返す（予約中／失敗残留の行は除外）
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('reflection_id', reflectionId)
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

  return NextResponse.json({ analysis: data ?? null });
}
