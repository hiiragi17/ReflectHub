export interface ErrorLog {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  statusCode?: number;
  type: string;
  isDev: boolean;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private queue: ErrorLog[] = [];
  private maxQueueSize = 50;
  private flushInterval = 30000;
  private flushTimeoutId: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    if (typeof window !== 'undefined') {
      this.flushTimeoutId = setInterval(() => this.flush(), this.flushInterval);
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  log(
    message: string,
    type: string,
    stack?: string,
    metadata?: Record<string, unknown>,
    statusCode?: number
  ): void {
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      message,
      stack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      statusCode,
      type,
      isDev: process.env.NODE_ENV === 'development',
      sessionId: this.sessionId,
      metadata,
    };

    this.queue.push(errorLog);

    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/logs/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend, sessionId: this.sessionId }),
      });
    } catch (error) {
      this.queue = [...logsToSend, ...this.queue];
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send error logs:', error);
      }
    }
  }

  getQueue(): ErrorLog[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
  }

  destroy(): void {
    if (this.flushTimeoutId) {
      clearInterval(this.flushTimeoutId);
    }
    this.flush();
  }
}

export const errorLoggingService = ErrorLoggingService.getInstance();

/** Guard to prevent double-registration of global error handlers. */
const SETUP_KEY = '__reflecthub_error_handling_registered';

export function setupErrorHandling(): void {
  if (typeof window === 'undefined') return;
  if ((window as unknown as Record<string, unknown>)[SETUP_KEY]) return;
  (window as unknown as Record<string, unknown>)[SETUP_KEY] = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    errorLoggingService.log(event.message, 'uncaught_error', event.error?.stack, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error ? event.reason.message : String(event.reason);

    errorLoggingService.log(
      message,
      'unhandled_rejection',
      event.reason instanceof Error ? event.reason.stack : undefined,
      { reason: event.reason }
    );
  });

  window.addEventListener('beforeunload', () => {
    errorLoggingService.flush();
  });
}
