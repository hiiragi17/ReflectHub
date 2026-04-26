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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'endpoint, p256dh, auth は必須です。' },
        { status: 400 },
      );
    }

    const { endpoint, p256dh, auth, user_agent, browser } = body as Record<string, unknown>;

    if (
      typeof endpoint !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof auth !== 'string' ||
      endpoint.trim() === '' ||
      p256dh.trim() === '' ||
      auth.trim() === ''
    ) {
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
          user_agent: typeof user_agent === 'string' ? user_agent : null,
          browser: typeof browser === 'string' ? browser : null,
          is_active: true,
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
