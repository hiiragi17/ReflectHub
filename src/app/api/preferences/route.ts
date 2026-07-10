import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_REMINDER_HOUR } from '@/types/push';
import type { NotificationPreferences } from '@/types/push';
import { PreferencesUpdateSchema } from '@/lib/validation/schemas';
import { parseJsonBody } from '@/lib/validation/parse';

const DEFAULT_PREFERENCES = {
  pwa_install_dismissed: false,
  timezone: 'Asia/Tokyo',
  notification_preferences: {
    reminder_weekday: null,
    reminder_hour: DEFAULT_REMINDER_HOUR,
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

    const parsed = await parseJsonBody(request, PreferencesUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const { pwa_install_dismissed, timezone, notification_preferences } = parsed.data;

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
      updates.pwa_install_dismissed = pwa_install_dismissed;
    }

    if (timezone !== undefined) {
      updates.timezone = timezone;
    }

    if (notification_preferences !== undefined) {
      const current =
        (existing?.notification_preferences as NotificationPreferences | undefined) ??
        DEFAULT_PREFERENCES.notification_preferences;
      updates.notification_preferences = { ...current, ...notification_preferences };
    }

    if (existing) {
      // 空の patch (`{}`) でも安全にパスするように、既存値をそのまま返す。
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ preferences: existing });
      }
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
