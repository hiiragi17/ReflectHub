import { supabase } from '@/lib/supabase/client';
import type {
  UserPreferences,
  UpdateUserPreferencesRequest,
  NotificationPreferences,
} from '@/types/push';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  daily_reminder: false,
  reminder_time: '20:00',
  weekly_summary: false,
  achievement_alerts: true,
};

export const preferencesService = {
  async getPreferences(userId: string): Promise<UserPreferences> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      throw { code: 'AUTH_ERROR', message: '認証されていません。ログインしてください。' };
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが存在しない場合はデフォルト値で作成
        return this.createDefaultPreferences(userId);
      }
      throw { code: 'DB_ERROR', message: error.message };
    }

    return data as UserPreferences;
  },

  async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        pwa_install_dismissed: false,
        timezone: 'Asia/Tokyo',
        notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      })
      .select()
      .single();

    if (error) {
      throw { code: 'DB_ERROR', message: error.message };
    }

    return data as UserPreferences;
  },

  async updatePreferences(
    userId: string,
    updates: UpdateUserPreferencesRequest,
  ): Promise<UserPreferences> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      throw { code: 'AUTH_ERROR', message: '認証されていません。ログインしてください。' };
    }

    const current = await this.getPreferences(userId);

    const merged: Partial<UserPreferences> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.pwa_install_dismissed !== undefined) {
      merged.pwa_install_dismissed = updates.pwa_install_dismissed;
    }
    if (updates.timezone !== undefined) {
      merged.timezone = updates.timezone;
    }
    if (updates.notification_preferences !== undefined) {
      merged.notification_preferences = {
        ...current.notification_preferences,
        ...updates.notification_preferences,
      };
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .update(merged)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw { code: 'DB_ERROR', message: error.message };
    }

    return data as UserPreferences;
  },
};
