import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';

    if (!code) {
      return NextResponse.redirect(new URL('/auth?error=no_code', requestUrl.origin));
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

    // Exchange the code for a session
    // This call will automatically set the auth cookies via the Supabase SSR client
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[auth/callback] Code exchange error:', exchangeError);
      return NextResponse.redirect(new URL('/auth?error=callback_error', requestUrl.origin));
    }

    console.log('[auth/callback] Successfully exchanged code for session, redirecting to:', next);
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (error) {
    console.error('[auth/callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/auth?error=unexpected_error', request.url));
  }
}
