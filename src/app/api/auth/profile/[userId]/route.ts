import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProfileUpdateSchema } from '@/lib/validation/schemas';
import { parseJsonBody } from '@/lib/validation/parse';
import { sanitizePlainText } from '@/utils/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }  // ← Promise<...> に変更
) {
  try {
    const { userId } = await params;  // ← await を追加

    // Cookie の読み書き (getAll / setAll) は共通の createClient に集約。
    const supabase = await createClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.id !== userId) {  // params.userId → userId
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // プロフィールが存在しない場合は新規作成
        const googleName = session.user.user_metadata?.full_name ||
                          session.user.user_metadata?.name ||
                          session.user.email?.split('@')[0] || 'ユーザー';

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            name: googleName,
            provider: 'google',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
          );
        }

        return NextResponse.json({ profile: newProfile });
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch profile' },
          { status: 500 }
        );
      }
    }

    // GETハンドラーは読み取り専用：既存プロフィールをそのまま返す
    // 名前の更新は /api/auth/session (POST) で行われる
    return NextResponse.json({ profile });

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const supabase = await createClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const parsed = await parseJsonBody(request, ProfileUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const safeName = sanitizePlainText(parsed.data.name);
    if (safeName.length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        name: safeName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: updatedProfile });

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}