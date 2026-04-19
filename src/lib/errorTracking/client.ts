import type {
  ErrorCategory,
  ErrorLogEntry,
  ErrorLogBatch,
  ErrorSeverity,
  ErrorTrackingContext,
} from '@/types/errorTracking';

const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 30_000;
const MAX_QUEUE_SIZE = 100;
const STORAGE_KEY = 'reflecthub_error_queue';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getSeverity(category: ErrorCategory, statusCode?: number): ErrorSeverity {
  if (category === 'uncaught_error' || category === 'unhandled_rejection') return 'critical';
  if (statusCode && statusCode >= 500) return 'critical';
  if (category === 'server' || category === 'network') return 'error';
  if (category === 'validation' || category === 'not_found') return 'warning';
  if (category === 'authentication' || category === 'authorization') return 'warning';
  if (category === 'offline') return 'info';
  return 'error';
}

function buildContext(override?: Partial<ErrorTrackingContext>): ErrorTrackingContext {
  return {
    page: typeof window !== 'undefined' ? window.location.pathname : '',
    // Use origin+pathname to avoid capturing sensitive query params / hash fragments by default.
    url:
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: Date.now(),
    ...override,
  };
}

class ErrorTrackingClient {
  private static instance: ErrorTrackingClient;
  private queue: ErrorLogEntry[] = [];
  private sessionId: string = `session_${generateId()}`;
  private userId?: string;
  private flushTimerId: ReturnType<typeof setInterval> | null = null;
  private rateLimitWindowMs = 60_000;
  private rateLimitMax = 30;
  private sentInWindow = 0;
  private windowStartAt = 0;
  private isFlushing = false;

  private constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      this.flushTimerId = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
      window.addEventListener('beforeunload', () => this.flushSync());
      window.addEventListener('online', () => this.flush());
    }
  }

  static getInstance(): ErrorTrackingClient {
    if (!ErrorTrackingClient.instance) {
      ErrorTrackingClient.instance = new ErrorTrackingClient();
    }
    return ErrorTrackingClient.instance;
  }

  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  capture(
    message: string,
    category: ErrorCategory,
    options?: {
      stack?: string;
      statusCode?: number;
      metadata?: Record<string, unknown>;
      context?: Partial<ErrorTrackingContext>;
    }
  ): void {
    const context = buildContext({
      userId: this.userId,
      sessionId: this.sessionId,
      ...options?.context,
    });

    const entry: ErrorLogEntry = {
      id: generateId(),
      userId: this.userId,
      errorType: category,
      message,
      stack: options?.stack,
      context,
      statusCode: options?.statusCode,
      severity: getSeverity(category, options?.statusCode),
      metadata: options?.metadata,
      createdAt: Date.now(),
    };

    this.enqueue(entry);

    if (this.queue.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  private enqueue(entry: ErrorLogEntry): void {
    this.queue.push(entry);
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue.shift();
    }
    this.saveToStorage();
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;
    let batch: ErrorLogEntry[] = [];
    try {
      const allowed = this.getRemainingRateLimit();
      if (allowed <= 0) return;

      const batchSize = Math.min(BATCH_SIZE, allowed, this.queue.length);
      if (batchSize <= 0) return;

      // Reserve quota before the async boundary so concurrent calls see it.
      this.sentInWindow += batchSize;
      batch = this.queue.splice(0, batchSize);
      this.saveToStorage();

      const payload: ErrorLogBatch = {
        logs: batch,
        sessionId: this.sessionId,
        batchId: generateId(),
        sentAt: Date.now(),
      };

      const res = await fetch('/api/logs/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        this.sentInWindow = Math.max(0, this.sentInWindow - batch.length);
        this.queue.unshift(...batch);
        this.saveToStorage();
      }
    } catch {
      this.sentInWindow = Math.max(0, this.sentInWindow - batch.length);
      this.queue.unshift(...batch);
      this.saveToStorage();
    } finally {
      this.isFlushing = false;
    }
  }

  /** Synchronous send via sendBeacon for use during page unload. */
  private flushSync(): void {
    if (
      this.queue.length === 0 ||
      typeof navigator === 'undefined' ||
      !navigator.sendBeacon
    ) {
      return;
    }
    const batch = this.queue.slice(0, BATCH_SIZE);
    const payload: ErrorLogBatch = {
      logs: batch,
      sessionId: this.sessionId,
      batchId: generateId(),
      sentAt: Date.now(),
    };
    const sent = navigator.sendBeacon('/api/logs/errors', JSON.stringify(payload));
    if (sent) {
      this.queue.splice(0, batch.length);
      this.saveToStorage();
    }
  }

  private getRemainingRateLimit(): number {
    const now = Date.now();
    if (now - this.windowStartAt > this.rateLimitWindowMs) {
      this.sentInWindow = 0;
      this.windowStartAt = now;
    }
    return Math.max(0, this.rateLimitMax - this.sentInWindow);
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue.slice(-MAX_QUEUE_SIZE)));
      }
    } catch {
      // localStorage may be unavailable
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as ErrorLogEntry[];
          this.queue = [...saved, ...this.queue].slice(-MAX_QUEUE_SIZE);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Ignore corrupt storage data
    }
  }

  getQueue(): ErrorLogEntry[] {
    return [...this.queue];
  }

  destroy(): void {
    if (this.flushTimerId) {
      clearInterval(this.flushTimerId);
    }
    this.flush();
  }
}

export const errorTrackingClient = ErrorTrackingClient.getInstance();

/** Guard to prevent double-registration of global error handlers. */
const TRACKING_REGISTERED_KEY = '__reflecthub_error_tracking_registered';

export function setupClientErrorTracking(): void {
  if (typeof window === 'undefined') return;
  if ((window as Record<string, unknown>)[TRACKING_REGISTERED_KEY]) return;
  (window as Record<string, unknown>)[TRACKING_REGISTERED_KEY] = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    errorTrackingClient.capture(event.message, 'uncaught_error', {
      stack: event.error?.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error ? event.reason.message : String(event.reason);
    errorTrackingClient.capture(message, 'unhandled_rejection', {
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
      metadata: { reason: String(event.reason) },
    });
  });
}
