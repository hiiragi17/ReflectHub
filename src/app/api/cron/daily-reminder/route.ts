import { NextRequest, NextResponse } from 'next/server';
import {
  buildReminderPayload,
  deactivateSubscriptions,
  getReminderTargets,
  markUserNotified,
} from '@/services/reminderService';
import { sendPushBatch } from '@/services/webPushSender';

/**
 * GET /api/cron/daily-reminder
 *
 * 定期実行スケジューラ (Supabase pg_cron) から JST 11:00 に呼び出されるエンドポイント。
 * スケジュール定義は database/daily-reminder-pg-cron.sql を参照。
 * - Authorization: Bearer ${CRON_SECRET} で認証
 * - 配信対象ユーザーを抽出 → ユーザーごとに並列で Web Push 送信
 * - 失効サブスクリプション (HTTP 404/410) は is_active=false に更新
 *   (401 はサーバー側 VAPID/JWT の問題なので無効化対象に含めない)
 * - 同日中の重複通知を防ぐため、配信成功時に user_preferences.last_notified_at を更新
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const { targets, skippedAlreadyNotified } = await getReminderTargets(now);
    const payload = buildReminderPayload();

    let sent = 0;
    let failed = 0;
    const skipped = skippedAlreadyNotified;
    const expiredSubscriptionIds: string[] = [];

    const perUserResults = await Promise.allSettled(
      targets.map(async (target) => {
        const results = await sendPushBatch(target.subscriptions, payload);

        let userSent = 0;
        let userFailed = 0;
        for (const r of results) {
          if (r.success) {
            userSent += 1;
          } else {
            userFailed += 1;
            if (r.expired) expiredSubscriptionIds.push(r.subscriptionId);
            console.error('[daily-reminder] push failed', {
              subscriptionId: r.subscriptionId,
              statusCode: r.statusCode,
              error: r.error,
            });
          }
        }

        if (userSent > 0) {
          try {
            await markUserNotified(target.userId, now);
          } catch (e) {
            console.error('[daily-reminder] markUserNotified failed', {
              userId: target.userId,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return { userSent, userFailed };
      }),
    );

    for (const r of perUserResults) {
      if (r.status === 'fulfilled') {
        sent += r.value.userSent;
        failed += r.value.userFailed;
      } else {
        failed += 1;
        console.error('[daily-reminder] target processing failed', r.reason);
      }
    }

    if (expiredSubscriptionIds.length > 0) {
      try {
        await deactivateSubscriptions(expiredSubscriptionIds);
      } catch (e) {
        console.error('[daily-reminder] deactivateSubscriptions failed', e);
      }
    }

    const totalSubscriptions = targets.reduce((acc, t) => acc + t.subscriptions.length, 0);
    // 配信対象が存在したのに 1 件も成功しなかった場合は systemic failure (VAPID 設定ミス等)
    // とみなして 500 を返し、Vercel Cron / 監視がジョブ失敗として検知できるようにする。
    const systemicFailure = totalSubscriptions > 0 && sent === 0 && failed > 0;
    const body = {
      ok: !systemicFailure,
      targets: targets.length,
      subscriptions: totalSubscriptions,
      sent,
      failed,
      skipped,
      deactivated: expiredSubscriptionIds.length,
      ...(systemicFailure ? { error: 'all push deliveries failed' } : {}),
    };
    return NextResponse.json(body, { status: systemicFailure ? 500 : 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'cron job failed';
    console.error('[daily-reminder] cron failed', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
