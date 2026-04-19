import { supabase } from '@/lib/supabase/client';
import { validatePushSubscriptionFields } from '@/lib/push/encryption';
import type {
  PushSubscription,
  CreatePushSubscriptionRequest,
} from '@/types/push';

export const pushService = {
  async subscribe(
    userId: string,
    request: CreatePushSubscriptionRequest,
  ): Promise<PushSubscription> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      throw { code: 'AUTH_ERROR', message: '認証されていません。ログインしてください。' };
    }

    const validationError = validatePushSubscriptionFields(
      request.endpoint,
      request.p256dh,
      request.auth,
    );
    if (validationError) {
      throw { code: 'VALIDATION_ERROR', message: validationError };
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: request.endpoint,
          p256dh: request.p256dh,
          auth: request.auth,
          user_agent: request.user_agent,
          browser: request.browser,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' },
      )
      .select()
      .single();

    if (error) {
      throw { code: 'DB_ERROR', message: error.message };
    }

    return data as PushSubscription;
  },

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      throw { code: 'AUTH_ERROR', message: '認証されていません。ログインしてください。' };
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      throw { code: 'DB_ERROR', message: error.message };
    }
  },

  async getActiveSubscriptions(userId: string): Promise<PushSubscription[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      throw { code: 'AUTH_ERROR', message: '認証されていません。ログインしてください。' };
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw { code: 'DB_ERROR', message: error.message };
    }

    return (data || []) as PushSubscription[];
  },
};
