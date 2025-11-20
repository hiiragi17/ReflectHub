import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }  // ← Promise<...> に変更
) {
  try {
    const { userId } = await params;  // ← await を追加

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
      .eq('id', userId)  // params.userId → userId
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name ||
                  session.user.user_metadata?.name ||
                  session.user.email?.split('@')[0] || 'ユーザー',
            provider: 'google',
            avatar_url: session.user.user_metadata?.avatar_url,
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

    return NextResponse.json({ profile });

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    // Verify session - try to get it from Authorization header first
    const authHeader = request.headers.get('Authorization');
    let session = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      console.log('[PUT /api/auth/profile] Verifying Bearer token:', token.slice(0, 20) + '...');

      const { data: { user }, error: verifyError } = await supabase.auth.getUser(token);

      if (!verifyError && user) {
        session = { user };
        console.log('[PUT /api/auth/profile] Session verified from Bearer token:', { userId: user.id });
      } else {
        console.error('[PUT /api/auth/profile] Bearer token verification failed:', verifyError?.message);
      }
    }

    // Fallback: try to get session from cookies
    if (!session) {
      const { data: { session: cookieSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !cookieSession) {
        console.error('[PUT /api/auth/profile] No session found in cookies or Bearer token');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      session = cookieSession;
    }

    console.log('[PUT /api/auth/profile] Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      paramUserId: userId,
    });

    if (!session) {
      console.error('[PUT /api/auth/profile] Session verification failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure user can only update their own profile
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Validate input
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Check if profile exists, create if not
    console.log('[PUT /api/auth/profile] Checking if profile exists for userId:', userId);
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    console.log('[PUT /api/auth/profile] Profile check result:', {
      hasProfile: !!existingProfile,
      checkError: checkError ? { code: checkError.code, message: checkError.message } : null,
    });

    if (checkError?.code === 'PGRST116') {
      // Profile doesn't exist, create it first
      console.log('[PUT /api/auth/profile] Profile not found, creating new profile');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          name: trimmedName,
          provider: 'google',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }

      console.log('[PUT /api/auth/profile] Profile created successfully');
      return NextResponse.json({ profile: newProfile });
    }

    if (checkError) {
      console.error('[PUT /api/auth/profile] Profile check error:', checkError);
      return NextResponse.json(
        { error: 'Failed to check profile' },
        { status: 500 }
      );
    }

    console.log('[PUT /api/auth/profile] Profile exists, updating...');
    // Update profile (don't use .select().single() due to potential RLS issues)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: trimmedName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[PUT /api/auth/profile] Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log('[PUT /api/auth/profile] Profile updated, fetching updated data...');
    // Fetch the updated profile separately
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !updatedProfile) {
      console.error('[PUT /api/auth/profile] Failed to fetch updated profile:', fetchError);
      return NextResponse.json(
        { error: 'Profile updated but failed to fetch updated data' },
        { status: 500 }
      );
    }

    console.log('[PUT /api/auth/profile] Profile updated successfully');
    return NextResponse.json({ profile: updatedProfile });

  } catch (error) {
    console.error('PUT /api/auth/profile/[userId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}