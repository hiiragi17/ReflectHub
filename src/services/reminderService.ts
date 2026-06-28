import { createServiceRoleClient } from '@/lib/supabase/server';
import type { NotificationPreferences, PushSubscription } from '@/types/push';

/**
 * 日次リマインダーのスケジューリング・配信対象決定ロジック。
 *
 * Vercel Cron 等から呼び出されるバッチ処理ヘルパー。
 * - ユーザーごとのタイムゾーンに基づき "現在ローカル時刻" を計算
 * - 設定された reminder_time と一致するユーザーを抽出
 * - 該当ユーザーの有効な push_subscriptions を取得
 */

export interface ReminderTarget {
  userId: string;
  timezone: string;
  reminderTime: string;
  /** ISO timestamp。未通知なら null */
  lastNotifiedAt: string | null;
  subscriptions: PushSubscription[];
}

export interface ReminderPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const DEFAULT_PAYLOAD: ReminderPayload = {
  title: 'ReflectHub - 振り返りの時間です',
  body: '今日の出来事を 1 つだけでも書き留めてみませんか？',
  url: '/reflection',
  tag: 'reflecthub-daily-reminder',
};

export function buildReminderPayload(overrides: Partial<ReminderPayload> = {}): ReminderPayload {
  return { ...DEFAULT_PAYLOAD, ...overrides };
}

/**
 * 指定 timezone での現在 HH:MM を返す。タイムゾーンが不正な場合は UTC にフォールバック。
 */
export function getLocalHHMM(now: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatter.format(now);
  } catch {
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

/**
 * "HH:MM" を分単位の数値へ。不正値は null。
 */
export function parseHHMM(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/**
 * リマインダー時刻と現在時刻の差が許容範囲内なら true。
 * Cron が ±tolerance 分間隔で動く前提で使う。
 */
export function shouldFireReminder(
  nowHHMM: string,
  reminderTime: string,
  toleranceMinutes = 5,
): boolean {
  const nowMin = parseHHMM(nowHHMM);
  const targetMin = parseHHMM(reminderTime);
  if (nowMin === null || targetMin === null) return false;
  const diff = Math.abs(nowMin - targetMin);
  return diff <= toleranceMinutes || diff >= 1440 - toleranceMinutes;
}

interface UserPreferenceRow {
  user_id: string;
  timezone: string;
  notification_preferences: NotificationPreferences | null;
  last_notified_at: string | null;
}

/**
 * 同日中にすでに通知済みかを判定する。
 * - timezone はユーザーのローカル日付境界を使う
 * - lastNotifiedAt が null の場合は未通知扱い
 */
export function isAlreadyNotifiedToday(
  now: Date,
  timezone: string,
  lastNotifiedAt: string | null,
): boolean {
  if (!lastNotifiedAt) return false;
  const last = new Date(lastNotifiedAt);
  if (Number.isNaN(last.getTime())) return false;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(now) === fmt.format(last);
  } catch {
    return now.toISOString().slice(0, 10) === last.toISOString().slice(0, 10);
  }
}

export interface ReminderTargetsResult {
  targets: ReminderTarget[];
  /** リマインダー時刻にマッチしたが、同日中に通知済みのためスキップしたユーザー数 */
  skippedAlreadyNotified: number;
}

/**
 * 配信対象のユーザーと subscription を返す。
 * RLS をバイパスする必要があるため service-role クライアントを使う。
 * Cron など信頼できるサーバー文脈からのみ呼び出すこと。
 */
export async function getReminderTargets(
  now: Date = new Date(),
  toleranceMinutes = 5,
): Promise<ReminderTargetsResult> {
  const supabase = createServiceRoleClient();

  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('user_id, timezone, notification_preferences, last_notified_at');

  if (prefsError) {
    console.error('[getReminderTargets] failed to fetch user_preferences:', prefsError);
    throw new Error(`Failed to fetch user_preferences: ${prefsError.message}`);
  }
  if (!prefs) return { targets: [], skippedAlreadyNotified: 0 };

  let skippedAlreadyNotified = 0;
  const candidates = (prefs as UserPreferenceRow[]).filter((row) => {
    const np = row.notification_preferences;
    if (!np || !np.daily_reminder) return false;
    const reminderTime = np.reminder_time ?? '20:00';
    const tz = row.timezone || 'UTC';
    const localNow = getLocalHHMM(now, tz);
    if (!shouldFireReminder(localNow, reminderTime, toleranceMinutes)) return false;
    if (isAlreadyNotifiedToday(now, tz, row.last_notified_at)) {
      skippedAlreadyNotified += 1;
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return { targets: [], skippedAlreadyNotified };

  const userIds = candidates.map((c) => c.user_id);
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (subsError) {
    console.error('[getReminderTargets] failed to fetch push_subscriptions:', subsError);
    throw new Error(`Failed to fetch push_subscriptions: ${subsError.message}`);
  }
  if (!subs) return { targets: [], skippedAlreadyNotified };

  const byUser = new Map<string, PushSubscription[]>();
  for (const sub of subs as PushSubscription[]) {
    const list = byUser.get(sub.user_id) ?? [];
    list.push(sub);
    byUser.set(sub.user_id, list);
  }

  const targets = candidates
    .map((row) => ({
      userId: row.user_id,
      timezone: row.timezone || 'UTC',
      reminderTime: row.notification_preferences?.reminder_time ?? '20:00',
      lastNotifiedAt: row.last_notified_at,
      subscriptions: byUser.get(row.user_id) ?? [],
    }))
    .filter((target) => target.subscriptions.length > 0);

  return { targets, skippedAlreadyNotified };
}

/**
 * 通知配信成功時に last_notified_at を now に更新する。
 */
export async function markUserNotified(userId: string, now: Date = new Date()): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('user_preferences')
    .update({ last_notified_at: now.toISOString() })
    .eq('user_id', userId);
  if (error) {
    console.error('[markUserNotified] failed to update last_notified_at:', error);
    throw new Error(`Failed to update last_notified_at: ${error.message}`);
  }
}

/**
 * Push エンドポイントが失効した subscription (404/410/401) を非アクティブ化する。
 */
export async function deactivateSubscriptions(subscriptionIds: string[]): Promise<void> {
  if (subscriptionIds.length === 0) return;
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .in('id', subscriptionIds);
  if (error) {
    console.error('[deactivateSubscriptions] failed:', error);
    throw new Error(`Failed to deactivate subscriptions: ${error.message}`);
  }
}
