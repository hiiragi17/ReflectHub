import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ErrorLogBatch, ErrorLogEntry, PersistedErrorLog } from '@/types/errorTracking';

const MAX_BATCH_SIZE = 50;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function safeToISOString(timestamp: number): string | null {
  const d = new Date(timestamp);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export async function POST(request: NextRequest) {
  let body: ErrorLogBatch;
  try {
    body = (await request.json()) as ErrorLogBatch;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    if (!body.logs || !Array.isArray(body.logs)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const candidateLogs = body.logs.slice(0, MAX_BATCH_SIZE);

    const isValidLog = (log: unknown): log is ErrorLogEntry => {
      if (!log || typeof log !== 'object') return false;
      const v = log as Partial<ErrorLogEntry>;
      return (
        typeof v.id === 'string' &&
        typeof v.errorType === 'string' &&
        typeof v.message === 'string' &&
        typeof v.createdAt === 'number' &&
        !!v.context &&
        typeof v.context === 'object'
      );
    };

    if (!candidateLogs.every(isValidLog)) {
      return NextResponse.json({ error: 'Invalid log entry' }, { status: 400 });
    }

    const logs: ErrorLogEntry[] = candidateLogs;

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Always use the server-verified userId; never trust client-supplied values.
    const userId = session?.user?.id ?? null;

    const rows = logs.map((log) => ({
      id: log.id,
      user_id: userId,
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
      created_at: safeToISOString(log.createdAt) ?? new Date().toISOString(),
    }));

    const { error } = await supabase.from('error_logs').insert(rows);

    if (error) {
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
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const perPage = Math.min(100, parsePositiveInt(searchParams.get('per_page'), 20));
    const offset = (page - 1) * perPage;

    // Users can only access their own logs
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: rows, error: logsError, count } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (logsError) {
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    const logs: PersistedErrorLog[] = (rows ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id ?? undefined,
      errorType: row.error_type,
      message: row.message,
      stack: row.stack ?? undefined,
      statusCode: row.status_code ?? undefined,
      severity: row.severity,
      context: {
        page: row.page ?? '',
        action: row.action ?? undefined,
        userId: row.user_id ?? undefined,
        sessionId: row.session_id ?? undefined,
        timestamp: new Date(row.created_at).getTime(),
        userAgent: row.user_agent ?? undefined,
        url: row.url ?? '',
      },
      metadata: row.metadata ?? undefined,
      resolved: row.resolved ?? false,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : undefined,
      resolvedBy: row.resolved_by ?? undefined,
      createdAt: new Date(row.created_at).getTime(),
    }));

    return NextResponse.json({ logs, total: count ?? 0, page, perPage });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
