import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ErrorLogBatch, ErrorLogEntry } from '@/types/errorTracking';

const MAX_BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ErrorLogBatch;

    if (!body.logs || !Array.isArray(body.logs)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const logs: ErrorLogEntry[] = body.logs.slice(0, MAX_BATCH_SIZE);

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;

    const rows = logs.map((log) => ({
      id: log.id,
      user_id: userId ?? log.userId ?? null,
      error_type: log.errorType,
      message: log.message,
      stack: log.stack ?? null,
      status_code: log.statusCode ?? null,
      severity: log.severity,
      page: log.context?.page ?? null,
      action: log.context?.action ?? null,
      url: log.context?.url ?? null,
      user_agent: log.context?.userAgent ?? null,
      session_id: log.context?.sessionId ?? body.sessionId ?? null,
      metadata: log.metadata ?? null,
      resolved: false,
      created_at: new Date(log.createdAt).toISOString(),
    }));

    const { error } = await supabase.from('error_logs').insert(rows);

    if (error) {
      // Still acknowledge receipt even if DB insert fails (avoid client retry loops)
      console.error('[ErrorLogs] DB insert failed:', error.message);
      return NextResponse.json(
        { success: false, received: 0, message: 'Storage error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, received: rows.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') ?? session.user.id;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)));
    const offset = (page - 1) * perPage;

    // Users can only access their own logs
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: logs, error: logsError, count } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (logsError) {
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      page,
      perPage,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
