import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTrends } from '@/services/analyticsService';
import type { Reflection } from '@/types/reflection';

const clampInt = (value: string | null, fallback: number, min: number, max: number): number => {
  if (value === null) return fallback;
  const trimmed = value.trim();
  if (trimmed === '') return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const weeks = clampInt(searchParams.get('weeks'), 12, 1, 52);
    const months = clampInt(searchParams.get('months'), 6, 1, 24);

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

    const trends = getTrends(
      (reflections as Reflection[]) || [],
      new Date(),
      { weeks, months },
    );

    return NextResponse.json({ trends });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
