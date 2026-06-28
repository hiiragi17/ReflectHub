const VALID_NOTIFICATION_KEYS = new Set(['reminder_weekday']);

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
  if ('reminder_weekday' in payload) {
    const v = payload.reminder_weekday;
    if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 6)) {
      return 'reminder_weekday は 0〜6 の整数または null である必要があります。';
    }
  }
  return null;
}
