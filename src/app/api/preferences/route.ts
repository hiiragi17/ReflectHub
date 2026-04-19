import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NotificationPreferences } from '@/types/push';

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

    const body = await request.json();
    const { pwa_install_dismissed, timezone, notification_preferences } = body;

    // 既存設定を取得
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (pwa_install_dismissed !== undefined) {
      updates.pwa_install_dismissed = Boolean(pwa_install_dismissed);
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
