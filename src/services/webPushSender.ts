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
 * subscription を渡された順 (新しい順を想定) に 1 件ずつ試し、最初に成功したら止める。
 *
 * - 成功したら以降は試さない (通知は 1 件だけ届く)。
 * - 失効 (404/410) が返った endpoint は「死んでいる」ため、次の候補へフォールバックする。
 * - 失効以外の失敗 (ネットワーク・500 等) では、他端末で改善する見込みが薄く、また
 *   全端末へ無駄に送るのを避けるため、そこで打ち切る。
 *
 * 試行したすべての結果を返す。呼び出し側は expired な subscription の無効化に使う。
 */
export async function sendPushToFirstAvailable(
  subscriptions: PushSubscription[],
  payload: unknown,
): Promise<SendPushResult[]> {
  const results: SendPushResult[] = [];
  for (const subscription of subscriptions) {
    const result = await sendPush(subscription, payload);
    results.push(result);
    // 成功、または失効以外の失敗なら打ち切り。失効時のみ次の端末へフォールバック。
    if (result.success || !result.expired) break;
  }
  return results;
}
