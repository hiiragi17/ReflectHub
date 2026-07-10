import { NextRequest, NextResponse } from 'next/server';
import {
  buildReminderPayload,
  deactivateSubscriptions,
  getReminderTargets,
  markUserNotified,
} from '@/services/reminderService';
import { sendPushToFirstAvailable } from '@/services/webPushSender';

/**
 * GET /api/cron/daily-reminder
 *
 * 定期実行スケジューラ (Supabase pg_cron) から毎時 0 分に呼び出されるエンドポイント。
 * スケジュール定義は database/daily-reminder-pg-cron.sql を参照。
 * - Authorization: Bearer ${CRON_SECRET} で認証
 * - ユーザーが設定した配信曜日・配信時刻 (JST) が現在と一致するユーザーを抽出
 *   → ユーザーごとに「最後に通知を ON にした端末」から順に
 *   Web Push 送信。1 件成功したら止める (通知は 1 台のみ)。先頭が失効していた場合は
 *   次に新しい端末へフォールバックする。
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
    // 実際に送信を試みた subscription の総数 (フォールバックで複数試すこともある)。
    let attempted = 0;
    const skipped = skippedAlreadyNotified;
    const expiredSubscriptionIds: string[] = [];

    const perUserResults = await Promise.allSettled(
      targets.map(async (target) => {
        // 「最後に通知を ON にした端末」から順に試し、1 件成功したら止める。
        // 先頭が失効していた場合のみ次の端末へフォールバックする。
        const results = await sendPushToFirstAvailable(target.subscriptions, payload);

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

        return { userSent, userFailed, userAttempted: results.length };
      }),
    );

    for (const r of perUserResults) {
      if (r.status === 'fulfilled') {
        sent += r.value.userSent;
        failed += r.value.userFailed;
        attempted += r.value.userAttempted;
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

    // 実際に送信を試みた subscription 数。フォールバックにより対象端末数とは一致しない。
    const totalSubscriptions = attempted;
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
