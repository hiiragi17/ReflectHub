import { NextRequest, NextResponse } from 'next/server';
import { buildReminderPayload, getReminderTargets } from '@/services/reminderService';

/**
 * GET /api/cron/daily-reminder
 *
 * Vercel Cron から定期的（例: 5 分間隔）に呼び出されるエンドポイント。
 * - Authorization: Bearer ${CRON_SECRET} で認証
 * - 配信対象ユーザーを抽出し、push subscription ごとにペイロードを生成
 *
 * 実際の Web Push 送信（VAPID 署名付き HTTP リクエスト）は web-push ライブラリ等を使う想定だが、
 * 依存追加を伴うためこのエンドポイントは「対象抽出 + ペイロード組み立て」までを担当する。
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const targets = await getReminderTargets(new Date());
    const payload = buildReminderPayload();

    return NextResponse.json({
      ok: true,
      targets: targets.length,
      subscriptions: targets.reduce((acc, t) => acc + t.subscriptions.length, 0),
      payload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'cron job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
