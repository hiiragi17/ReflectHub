import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, refresh_token } = body;

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // Silent failure
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete({ name, ...options });
            } catch {
              // Silent failure
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to set session', details: error.message },
        { status: 500 }
      );
    }

    if (data.session) {
      // プロフィール確認・作成・更新
      try {
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', data.session.user.id)
          .single();

        const googleName = data.session.user.user_metadata?.full_name ||
                          data.session.user.user_metadata?.name ||
                          data.session.user.email?.split('@')[0];

        if (profileError && profileError.code === 'PGRST116') {
          // プロフィールが存在しない場合は新規作成
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email,
              name: googleName,
              provider: 'google',
              avatar_url: data.session.user.user_metadata?.avatar_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (createError) {
            console.error('Profile creation error:', createError);
          }
        } else if (existingProfile && googleName) {
          // 既存プロフィールの名前がデフォルト値の場合のみ、Googleの名前で更新
          const currentName = existingProfile.name || '';
          const emailPrefix = data.session.user.email?.split('@')[0] || '';
          const isDefaultName = currentName === 'Test User' ||
                               currentName === 'ユーザー' ||
                               currentName === emailPrefix;

          if (isDefaultName) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                name: googleName,
                avatar_url: data.session.user.user_metadata?.avatar_url,
                updated_at: new Date().toISOString(),
              })
              .eq('id', data.session.user.id);

            if (updateError) {
              console.error('Profile update error:', updateError);
            }
          } else {
            // ユーザーが手動で変更した名前はそのまま保持し、アバターのみ更新
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                avatar_url: data.session.user.user_metadata?.avatar_url,
                updated_at: new Date().toISOString(),
              })
              .eq('id', data.session.user.id);

            if (updateError) {
              console.error('Profile avatar update error:', updateError);
            }
          }
        }
      } catch (err) {
        console.error('Profile operation error:', err);
      }

      const response = NextResponse.json({ 
        success: true, 
        user: data.session.user.email 
      });
      
      response.cookies.set('session-set', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
      
      return response;
    }

    return NextResponse.json(
      { error: 'No session created' },
      { status: 500 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}