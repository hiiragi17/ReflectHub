import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NotificationPreferences } from '@/types/push';
import { validateNotificationPreferences } from '@/lib/push/validation';

const DEFAULT_PREFERENCES = {
  pwa_install_dismissed: false,
  timezone: 'Asia/Tokyo',
  notification_preferences: {
    daily_reminder: false,
    reminder_time: '20:00',
    weekly_summary: false,
    achievement_alerts: true,
  } as NotificationPreferences,
};

async function refetchPreferences(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 存在しない場合はデフォルト値で作成
        const { data: created, error: createError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, ...DEFAULT_PREFERENCES })
          .select()
          .single();

        if (createError) {
          // 同時リクエストで先に作成済みの場合は再フェッチ
          if (createError.code === '23505') {
            const { data: refetched, error: refetchError } = await refetchPreferences(supabase, user.id);
            if (refetchError) {
              return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
            }
            return NextResponse.json({ preferences: refetched });
          }
          return NextResponse.json(
            { error: 'Failed to create preferences' },
            { status: 500 },
          );
        }

        return NextResponse.json({ preferences: created });
      }

      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 },
      );
    }

    return NextResponse.json({ preferences: data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { pwa_install_dismissed, timezone, notification_preferences } =
      body as Record<string, unknown>;

    // 既存設定を取得（エラーを明示的に処理する）
    const { data: existing, error: existingError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 },
      );
    }

    const updates: Record<string, unknown> = {};

    if (pwa_install_dismissed !== undefined) {
      if (typeof pwa_install_dismissed !== 'boolean') {
        return NextResponse.json(
          { error: 'pwa_install_dismissed は boolean である必要があります。' },
          { status: 400 },
        );
      }
      updates.pwa_install_dismissed = pwa_install_dismissed;
    }

    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || timezone.trim() === '') {
        return NextResponse.json(
          { error: 'timezone は有効な文字列である必要があります。' },
          { status: 400 },
        );
      }
      updates.timezone = timezone.trim();
    }

    if (notification_preferences !== undefined) {
      if (
        typeof notification_preferences !== 'object' ||
        notification_preferences === null ||
        Array.isArray(notification_preferences)
      ) {
        return NextResponse.json(
          { error: 'notification_preferences はオブジェクトである必要があります。' },
          { status: 400 },
        );
      }
      const validationError = validateNotificationPreferences(
        notification_preferences as Record<string, unknown>,
      );
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      const current =
        existing?.notification_preferences ?? DEFAULT_PREFERENCES.notification_preferences;
      updates.notification_preferences = { ...current, ...notification_preferences };
    }

    if (existing) {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update preferences' },
          { status: 500 },
        );
      }

      return NextResponse.json({ preferences: data });
    }

    // 存在しない場合は作成
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: user.id,
        ...DEFAULT_PREFERENCES,
        ...updates,
      })
      .select()
      .single();

    if (error) {
      // 同時リクエストで先に作成済みの場合は更新に切り替え
      if (error.code === '23505') {
        const { data: updated, error: updateError } = await supabase
          .from('user_preferences')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
        }
        return NextResponse.json({ preferences: updated });
      }
      return NextResponse.json(
        { error: 'Failed to create preferences' },
        { status: 500 },
      );
    }

    return NextResponse.json({ preferences: data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
