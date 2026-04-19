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

export interface NotificationPreferences {
  daily_reminder: boolean;
  reminder_time?: string; // HH:MM format
  weekly_summary: boolean;
  achievement_alerts: boolean;
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
