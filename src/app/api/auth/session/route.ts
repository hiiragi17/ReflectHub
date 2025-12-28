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

    const response = NextResponse.json({ success: true });
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
              response.cookies.set({ name, value, ...options });
            } catch {
              // Silent failure
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete({ name, ...options });
              response.cookies.delete({ name, ...options });
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
      // プロフィール確認・作成
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.session.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email,
              name: data.session.user.user_metadata?.full_name ||
                    data.session.user.user_metadata?.name ||
                    data.session.user.email?.split('@')[0],
              provider: 'google',
              avatar_url: data.session.user.user_metadata?.avatar_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (createError) {
            // プロフィール作成エラーは非致命的
          }
        }
      } catch {
        // プロフィール関連エラーは非致命的
      }

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