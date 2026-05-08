import { NextRequest, NextResponse } from 'next/server';
import {
  buildWeeklyReminderPayload,
  getWeeklyReminderTargets,
} from '@/services/reminderService';

/**
 * GET /api/cron/weekly-reminder
 *
 * 週 1 回 (日曜) の振り返りまとめ通知用エンドポイント。
 * - Authorization: Bearer ${CRON_SECRET} で認証
 * - 各ユーザーのタイムゾーンに基づき、ローカル日曜・reminder_time のユーザーのみを抽出
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targets = await getWeeklyReminderTargets(new Date());
    const payload = buildWeeklyReminderPayload();

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
