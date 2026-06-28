import { createServiceRoleClient } from '@/lib/supabase/server';
import type { NotificationPreferences, PushSubscription } from '@/types/push';

/**
 * 週次リマインダーのスケジューリング・配信対象決定ロジック。
 *
 * Vercel Cron から JST 11:00 (= 02:00 UTC) に 1 日 1 回呼び出される前提。
 * - ユーザーが設定した配信曜日 (reminder_weekday) と、ローカルタイムゾーンでの
 *   "今日の曜日" が一致するユーザーを抽出
 * - 該当ユーザーの有効な push_subscriptions を取得
 * - 同日中の重複通知は last_notified_at で防止
 */

export interface ReminderTarget {
  userId: string;
  timezone: string;
  /** 0=日曜〜6=土曜 */
  reminderWeekday: number;
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
 * リマインダー配信は JST 11:00 固定。曜日判定・同日判定はすべてこの固定の
 * タイムゾーンで行う。user_preferences.timezone はユーザーが変更でき得るため、
 * 配信曜日の判定には使わない (非 JST の値が入ると曜日がずれるため)。
 */
const REMINDER_TIMEZONE = 'Asia/Tokyo';

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * 指定 timezone での現在の曜日 (0=日曜〜6=土曜) を返す。
 * タイムゾーンが不正な場合は UTC の曜日にフォールバックする。
 */
export function getLocalWeekday(now: Date, timezone: string): number {
  try {
    const short = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).format(now);
    return WEEKDAY_MAP[short] ?? now.getUTCDay();
  } catch {
    return now.getUTCDay();
  }
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
  /** 配信曜日にマッチしたが、同日中に通知済みのためスキップしたユーザー数 */
  skippedAlreadyNotified: number;
}

/**
 * 配信対象のユーザーと subscription を返す。
 * RLS をバイパスする必要があるため service-role クライアントを使う。
 * Cron など信頼できるサーバー文脈からのみ呼び出すこと。
 *
 * timezone フィールドは残しているが、当面は全ユーザー JST (Asia/Tokyo) 前提で動作する。
 */
export async function getReminderTargets(
  now: Date = new Date(),
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
    const weekday = row.notification_preferences?.reminder_weekday;
    if (weekday === null || weekday === undefined) return false;
    // 配信は JST 固定。保存済み timezone ではなく常に JST で曜日・同日を判定する。
    if (getLocalWeekday(now, REMINDER_TIMEZONE) !== weekday) return false;
    if (isAlreadyNotifiedToday(now, REMINDER_TIMEZONE, row.last_notified_at)) {
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
      timezone: REMINDER_TIMEZONE,
      reminderWeekday: row.notification_preferences!.reminder_weekday as number,
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
 * Push エンドポイントが失効した subscription (404/410) を非アクティブ化する。
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
