import { supabase } from '@/lib/supabase/client';
import type {
  UserPreferences,
  UpdateUserPreferencesRequest,
  NotificationPreferences,
} from '@/types/push';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  reminder_weekday: null,
};

export const preferencesService = {
  async _verifyAuth(userId: string): Promise<void> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      throw { code: 'AUTH_ERROR', message: '認証されていません。ログインしてください。' };
    }
  },

  async _createDefaultPreferences(userId: string): Promise<UserPreferences> {
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
      // UNIQUE 制約違反 = 別リクエストが先に作成済み → 再フェッチ
      if (error.code === '23505') {
        const { data: existing, error: fetchError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          throw { code: 'DB_ERROR', message: fetchError.message };
        }
        return existing as UserPreferences;
      }
      throw { code: 'DB_ERROR', message: error.message };
    }

    return data as UserPreferences;
  },

  async _fetchOrCreate(userId: string): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return this._createDefaultPreferences(userId);
      }
      throw { code: 'DB_ERROR', message: error.message };
    }

    return data as UserPreferences;
  },

  async getPreferences(userId: string): Promise<UserPreferences> {
    await this._verifyAuth(userId);
    return this._fetchOrCreate(userId);
  },

  async updatePreferences(
    userId: string,
    updates: UpdateUserPreferencesRequest,
  ): Promise<UserPreferences> {
    await this._verifyAuth(userId);

    const current = await this._fetchOrCreate(userId);

    const merged: Partial<UserPreferences> = {};

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
