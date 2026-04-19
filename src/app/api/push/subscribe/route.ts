import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validatePushSubscriptionFields } from '@/lib/push/encryption';

export async function POST(request: NextRequest) {
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
    const { endpoint, p256dh, auth, user_agent, browser } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'endpoint, p256dh, auth は必須です。' },
        { status: 400 },
      );
    }

    const validationError = validatePushSubscriptionFields(endpoint, p256dh, auth);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: user_agent ?? null,
          browser: browser ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save push subscription' },
        { status: 500 },
      );
    }

    return NextResponse.json({ subscription: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
