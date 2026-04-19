import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/services/analyticsService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [reflectionsResult, frameworksResult] = await Promise.all([
      supabase.from('retrospectives').select('*').eq('user_id', user.id),
      supabase.from('frameworks').select('*').eq('is_active', true),
    ]);

    if (reflectionsResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch reflections' },
        { status: 500 },
      );
    }

    if (frameworksResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch frameworks' },
        { status: 500 },
      );
    }

    const frameworks: Framework[] = (frameworksResult.data || []).map((f) => ({
      ...f,
      schema: f.schema?.fields || [],
    }));

    const summary = getSummary(
      (reflectionsResult.data as Reflection[]) || [],
      frameworks,
    );

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
