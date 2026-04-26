const VALID_NOTIFICATION_KEYS = new Set([
  'daily_reminder',
  'reminder_time',
  'weekly_summary',
  'achievement_alerts',
]);

/**
 * notification_preferences ペイロードのキーと型を検証する。
 * 問題がなければ null、エラーがあれば日本語メッセージを返す。
 */
export function validateNotificationPreferences(
  payload: Record<string, unknown>,
): string | null {
  for (const key of Object.keys(payload)) {
    if (!VALID_NOTIFICATION_KEYS.has(key)) {
      return `不明なキー "${key}" が含まれています。`;
    }
  }
  if ('daily_reminder' in payload && typeof payload.daily_reminder !== 'boolean') {
    return 'daily_reminder は boolean である必要があります。';
  }
  if ('weekly_summary' in payload && typeof payload.weekly_summary !== 'boolean') {
    return 'weekly_summary は boolean である必要があります。';
  }
  if ('achievement_alerts' in payload && typeof payload.achievement_alerts !== 'boolean') {
    return 'achievement_alerts は boolean である必要があります。';
  }
  if ('reminder_time' in payload) {
    const t = payload.reminder_time;
    if (typeof t !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)) {
      return 'reminder_time は HH:MM 形式 (00:00〜23:59) である必要があります。';
    }
  }
  return null;
}
