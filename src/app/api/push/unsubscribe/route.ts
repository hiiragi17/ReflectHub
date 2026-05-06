import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PushUnsubscribeSchema } from '@/lib/validation/schemas';
import { parseJsonBody } from '@/lib/validation/parse';

export async function POST(request: NextRequest) {
  try {
    // CSRF は middleware で検証済み。
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, PushUnsubscribeSchema);
    if (!parsed.ok) return parsed.response;
    const { endpoint } = parsed.data;

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
