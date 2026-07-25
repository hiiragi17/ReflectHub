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
 * 設定を新規作成するときの既定の配信時刻 (JST)。
 * 従来の固定配信時刻 (11:00) を踏襲する。
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
   * カラムのデフォルトと notification-preferences-hour.sql の補完により
   * 全行がこのキーを持つ前提。
   */
  reminder_hour: number;
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
