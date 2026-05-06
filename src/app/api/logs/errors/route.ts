import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  ErrorCategory,
  ErrorSeverity,
  PersistedErrorLog,
} from '@/types/errorTracking';
import { ErrorLogsBatchSchema, type ErrorLogsBatchInput } from '@/lib/validation/schemas';
import { parseJsonBody } from '@/lib/validation/parse';

/**
 * zod スキーマ (`ErrorLogEntrySchema`) は `passthrough()` で柔軟に受けるため
 * `ErrorLogEntry` 型と完全には一致しない。本ハンドラ内で必要な DB 行への
 * 詰め替えに必要な最小フィールドだけを取り出す型として定義する。
 */
type ParsedLog = ErrorLogsBatchInput['logs'][number];

function rowFromLog(log: ParsedLog, userId: string | null, fallbackSessionId: string | undefined) {
  return {
    id: log.id,
    user_id: userId,
    error_type: log.errorType as ErrorCategory,
    message: log.message,
    stack: log.stack ?? null,
    status_code: log.statusCode ?? null,
    severity: log.severity as ErrorSeverity,
    page: log.context?.page ?? null,
    action: log.context?.action ?? null,
    url: log.context?.url ?? null,
    user_agent: log.context?.userAgent ?? null,
    session_id: log.context?.sessionId ?? fallbackSessionId ?? null,
    metadata: (log as { metadata?: Record<string, unknown> }).metadata ?? null,
    resolved: false,
    created_at: safeToISOString(log.createdAt) ?? new Date().toISOString(),
  };
}

type DbErrorLogRow = {
  id: string;
  user_id: string | null;
  error_type: ErrorCategory;
  message: string;
  stack: string | null;
  status_code: number | null;
  severity: ErrorSeverity;
  page: string | null;
  action: string | null;
  url: string | null;
  user_agent: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

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
  const parsed = await parseJsonBody(request, ErrorLogsBatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const logs = body.logs.slice(0, MAX_BATCH_SIZE);

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Always use the server-verified userId; never trust client-supplied values.
    const userId = session?.user?.id ?? null;

    const rows = logs.map((log) => rowFromLog(log, userId, body.sessionId));

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

    const logs: PersistedErrorLog[] = ((rows ?? []) as DbErrorLogRow[]).map((row) => ({
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
