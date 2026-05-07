import webpush, { type PushSubscription as WebPushSubscription, type SendResult, WebPushError } from 'web-push';
import type { PushSubscription } from '@/types/push';

/**
 * web-push ライブラリのラッパー。VAPID 設定の遅延初期化と、
 * 失効サブスクリプション (HTTP 401/404/410) の判定を提供する。
 *
 * Cron ジョブなど信頼できるサーバー文脈からのみ呼び出すこと。
 */

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@reflecthub.app';
  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID keys are not configured: set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY',
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

/** テスト用に内部の VAPID 初期化フラグをリセット */
export function __resetVapidConfigForTests() {
  vapidConfigured = false;
}

export interface SendPushResult {
  subscriptionId: string;
  endpoint: string;
  success: boolean;
  /** subscription を無効化すべきなら true (HTTP 401/404/410) */
  expired: boolean;
  statusCode?: number;
  error?: string;
}

function toWebPushSubscription(sub: PushSubscription): WebPushSubscription {
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };
}

/**
 * 指定 subscription へ Web Push を送信する。
 * 例外は呼び出し側で扱いやすいよう SendPushResult に正規化して返す。
 */
export async function sendPush(
  subscription: PushSubscription,
  payload: unknown,
): Promise<SendPushResult> {
  configureVapid();

  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const result: SendResult = await webpush.sendNotification(
      toWebPushSubscription(subscription),
      body,
    );
    return {
      subscriptionId: subscription.id,
      endpoint: subscription.endpoint,
      success: true,
      expired: false,
      statusCode: result.statusCode,
    };
  } catch (err) {
    const statusCode = err instanceof WebPushError ? err.statusCode : undefined;
    // RFC 8030: 404 (Not Found) / 410 (Gone) のみが「subscription 失効」を意味する。
    // 401 はサーバー側 VAPID/JWT の問題なので、subscription 自体を無効化してはいけない
    // (VAPID 鍵ミスで全件 401 を返したとき、全 subscription が無効化されるリスクを避ける)。
    const expired = statusCode === 404 || statusCode === 410;
    const message = err instanceof Error ? err.message : String(err);
    return {
      subscriptionId: subscription.id,
      endpoint: subscription.endpoint,
      success: false,
      expired,
      statusCode,
      error: message,
    };
  }
}

/**
 * 複数の subscription へ並列送信。1 件の失敗が他に影響しないよう Promise.allSettled を使う。
 */
export async function sendPushBatch(
  subscriptions: PushSubscription[],
  payload: unknown,
): Promise<SendPushResult[]> {
  const settled = await Promise.allSettled(subscriptions.map((s) => sendPush(s, payload)));
  return settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const sub = subscriptions[i];
    return {
      subscriptionId: sub.id,
      endpoint: sub.endpoint,
      success: false,
      expired: false,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}
