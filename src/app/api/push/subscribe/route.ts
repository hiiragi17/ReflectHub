import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PushSubscribeSchema } from '@/lib/validation/schemas';
import { parseJsonBody } from '@/lib/validation/parse';
import { isMobileUserAgent } from '@/utils/userAgent';

export async function POST(request: NextRequest) {
  try {
    // CSRF は middleware で検証済み (defense-in-depth として個別ルートで再検証はしない)。
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, PushSubscribeSchema);
    if (!parsed.ok) return parsed.response;
    const { endpoint, p256dh, auth, user_agent, browser } = parsed.data;

    // プッシュ通知はスマートフォンのみ対応。クライアントから送られた user_agent を
    // 信頼せず、Request の User-Agent ヘッダも併せて確認する。
    const headerUA = request.headers.get('user-agent');
    if (!isMobileUserAgent(user_agent) && !isMobileUserAgent(headerUA)) {
      return NextResponse.json(
        { error: 'Push notifications are only supported on mobile devices.' },
        { status: 400 },
      );
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
