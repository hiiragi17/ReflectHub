import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Debug: log all cookies received
    console.log('[GET /api/auth/verify] Received cookies:', {
      cookieCount: cookieStore.getAll().length,
      cookieNames: cookieStore.getAll().map(c => c.name),
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = cookieStore.get(name)?.value;
            console.log(`[GET /api/auth/verify] Getting cookie "${name}":`, !!value);
            return value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
              console.log(`[GET /api/auth/verify] Setting cookie "${name}"`);
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

    const { data: { session }, error } = await supabase.auth.getSession();

    console.log('[GET /api/auth/verify] Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      error: error?.message,
    });

    if (error) {
      return NextResponse.json(
        { authenticated: false, error: error.message },
        { status: 200 }
      );
    }

    if (session?.user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
        }
      });
    }

    return NextResponse.json({
      authenticated: false,
      message: 'No active session'
    });

  } catch {
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}