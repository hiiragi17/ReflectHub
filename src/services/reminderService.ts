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
}

/**
 * 配信対象のユーザーと subscription を返す。
 * RLS をバイパスする必要があるため service-role クライアントを使う。
 * Cron など信頼できるサーバー文脈からのみ呼び出すこと。
 */
export async function getReminderTargets(
  now: Date = new Date(),
  toleranceMinutes = 5,
): Promise<ReminderTarget[]> {
  const supabase = createServiceRoleClient();

  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('user_id, timezone, notification_preferences');

  if (prefsError) {
    console.error('[getReminderTargets] failed to fetch user_preferences:', prefsError);
    throw new Error(`Failed to fetch user_preferences: ${prefsError.message}`);
  }
  if (!prefs) return [];

  const candidates = (prefs as UserPreferenceRow[]).filter((row) => {
    const np = row.notification_preferences;
    if (!np || !np.daily_reminder) return false;
    const reminderTime = np.reminder_time ?? '20:00';
    const localNow = getLocalHHMM(now, row.timezone || 'UTC');
    return shouldFireReminder(localNow, reminderTime, toleranceMinutes);
  });

  if (candidates.length === 0) return [];

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
  if (!subs) return [];

  const byUser = new Map<string, PushSubscription[]>();
  for (const sub of subs as PushSubscription[]) {
    const list = byUser.get(sub.user_id) ?? [];
    list.push(sub);
    byUser.set(sub.user_id, list);
  }

  return candidates
    .map((row) => ({
      userId: row.user_id,
      timezone: row.timezone || 'UTC',
      reminderTime: row.notification_preferences?.reminder_time ?? '20:00',
      subscriptions: byUser.get(row.user_id) ?? [],
    }))
    .filter((target) => target.subscriptions.length > 0);
}
