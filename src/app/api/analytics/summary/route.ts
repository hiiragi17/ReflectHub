import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { frameworkService } from '@/services/frameworkService';
import { getSummary } from '@/services/analyticsService';
import type { Reflection } from '@/types/reflection';

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

    const { data: reflections, error: reflectionsError } = await supabase
      .from('retrospectives')
      .select('*')
      .eq('user_id', user.id);

    if (reflectionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch reflections' },
        { status: 500 },
      );
    }

    const frameworks = await frameworkService.getFrameworks();
    const summary = getSummary((reflections as Reflection[]) || [], frameworks);

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
