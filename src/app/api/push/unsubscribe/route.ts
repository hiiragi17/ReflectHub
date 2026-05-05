import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, verifyCSRF } from '@/utils/csrfToken';

export async function POST(request: NextRequest) {
  try {
    const csrf = verifyCSRF(
      request.headers.get(CSRF_HEADER_NAME),
      request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null,
    );
    if (!csrf.ok) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

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
      return NextResponse.json({ error: 'endpoint は必須です。' }, { status: 400 });
    }

    const { endpoint } = body as { endpoint?: unknown };

    if (typeof endpoint !== 'string' || endpoint.trim() === '') {
      return NextResponse.json(
        { error: 'endpoint は必須です。' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to unsubscribe push subscription' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
