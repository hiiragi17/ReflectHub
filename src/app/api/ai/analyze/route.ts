import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenAI, DAILY_RATE_LIMIT } from '@/services/aiAnalysisService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import type { Analysis, AnalysisError, AnalysisResponse } from '@/types/analysis';

interface RawBody {
  reflection_id?: unknown;
}

interface ReservationRow {
  reservation_id: string | null;
  used: number;
  next_available_at: string | null;
}

const WINDOW_HOURS = 24;
// 予約のリース秒数。OpenAI 呼び出しの想定タイムアウトより十分長く、
// かつクラッシュ後に枠を返却できる短さに設定。
const RESERVATION_LEASE_SECONDS = 300;

function errorResponse(error: AnalysisError, status: number) {
  return NextResponse.json({ error }, { status });
}

function fallbackResetAt(): string {
  // 該当エントリが無い場合のフォールバック: 今から WINDOW_HOURS 後
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
  // RPC 内でも所有権を再チェックしているが、ルートでも先に確認することで RPC を呼ばずに 404 を返せる。
  const { data: reflectionRow, error: reflectionError } = await supabase
    .from('retrospectives')
    .select('*')
    .eq('id', reflectionId)
    .eq('user_id', user.id)
    .single();

  if (reflectionError) {
    if (reflectionError.code === 'PGRST116') {
      return errorResponse(
        { code: 'NOT_FOUND', message: '対象の振り返りが見つかりません。' },
        404,
      );
    }
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '振り返りの取得に失敗しました。' },
      500,
    );
  }

  if (!reflectionRow) {
    return errorResponse(
      { code: 'NOT_FOUND', message: '対象の振り返りが見つかりません。' },
      404,
    );
  }

  const reflection = reflectionRow as Reflection;

  // 原子的にスロットを予約（SECURITY DEFINER RPC）。
  // ai_analyses への書き込みはこの RPC とその仲間 (release / complete) のみが行う。
  // クライアントは SELECT のみ可能なので、クォータや AI 生成内容の不変条件をバイパスできない。
  const { data: reservationRows, error: reserveError } = await supabase.rpc(
    'reserve_ai_analysis_slot',
    {
      p_reflection_id: reflection.id,
      p_max_per_window: DAILY_RATE_LIMIT,
      p_window_hours: WINDOW_HOURS,
      p_lease_seconds: RESERVATION_LEASE_SECONDS,
    },
  );

  if (reserveError) {
    const code = (reserveError as { code?: string }).code;
    if (code === '42501') {
      return errorResponse(
        { code: 'NOT_FOUND', message: '対象の振り返りが見つかりません。' },
        404,
      );
    }
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
    // RPC が返す next_available_at は「次に枠が 1 つ空く時刻」。
    // 完了行は created_at + 24h、未完了行は expires_at で開放される、その最小値。
    const resetAt = reservation.next_available_at ?? fallbackResetAt();
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
    // 失敗時は RPC で予約をロールバックして枠を解放する
    await supabase.rpc('release_ai_analysis_slot', {
      p_reservation_id: reservationId,
    });

    const wrapped = err as AnalysisError;
    if (wrapped?.code === 'OPENAI_ERROR') {
      return errorResponse(wrapped, 502);
    }
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析の実行に失敗しました。' },
      500,
    );
  }

  // 成功: 予約を完了状態にする RPC を呼ぶ。
  // クライアントが完了行を直接 UPDATE できない代わりに、こちらが状態遷移を一手に握る。
  const { data: completedRow, error: completeError } = await supabase.rpc(
    'complete_ai_analysis',
    {
      p_reservation_id: reservationId,
      p_growth_points: payload.growth_points,
      p_improvement_suggestions: payload.improvement_suggestions,
      p_emotional_trend: payload.emotional_trend,
      p_key_achievements: payload.key_achievements,
      p_challenges: payload.challenges,
      p_recommendations: payload.recommendations,
      p_metadata: metadata,
    },
  );

  if (completeError || !completedRow) {
    // 完了 UPDATE に失敗したら予約行を解放しておく（永久に枠を消費しないため）
    await supabase.rpc('release_ai_analysis_slot', {
      p_reservation_id: reservationId,
    });
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: '分析結果の保存に失敗しました。' },
      500,
    );
  }

  // SECURITY DEFINER 関数 (RETURNS ai_analyses) は単一行を返す。
  const completed = (
    Array.isArray(completedRow) ? completedRow[0] : completedRow
  ) as Analysis;

  const responsePayload: AnalysisResponse = {
    analysis: completed,
    rate_limit: {
      remaining: Math.max(0, DAILY_RATE_LIMIT - reservation.used),
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
