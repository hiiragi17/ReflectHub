export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  browser?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  browser?: string;
}

/**
 * reminder_hour が未設定 (キー無し) の場合のデフォルト配信時刻 (JST)。
 * 従来の固定配信時刻 (11:00) を踏襲する。設定作成時のデフォルトと
 * 配信判定のフォールバックの両方でこの値を使うこと。
 */
export const DEFAULT_REMINDER_HOUR = 11;

export interface NotificationPreferences {
  /**
   * リマインダーを配信する曜日。0=日曜〜6=土曜。
   * null の場合は配信しない (OFF)。
   */
  reminder_weekday: number | null;
  /**
   * リマインダーを配信する時刻 (JST、0〜23 時)。
   * 既存行などキーが無い場合は 11 (従来の固定時刻) として扱う。
   */
  reminder_hour?: number;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  pwa_install_dismissed: boolean;
  timezone: string;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserPreferencesRequest {
  pwa_install_dismissed?: boolean;
  timezone?: string;
  notification_preferences?: Partial<NotificationPreferences>;
}
