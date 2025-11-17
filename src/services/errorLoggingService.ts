/**
 * Error Logging Service
 * Collects and sends error information to server
 */

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

/**
 * Error Logging Service for collecting and sending error logs
 */
class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private queue: ErrorLog[] = [];
  private maxQueueSize = 50;
  private flushInterval = 30000; // 30 seconds
  private flushTimeoutId: NodeJS.Timeout | null = null;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();

    // Set up periodic flush
    if (typeof window !== 'undefined') {
      this.flushTimeoutId = setInterval(() => this.flush(), this.flushInterval);
    }

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add error log to queue
   */
  log(
    message: string,
    type: string,
    stack?: string,
    metadata?: Record<string, unknown>,
    statusCode?: number
  ): void {
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

    // Flush if queue is getting full
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Send queued logs to server
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      // If sending fails, put logs back in queue
      this.queue = [...logsToSend, ...this.queue];

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send error logs:', error);
      }
    }
  }

  /**
   * Get current queue
   */
  getQueue(): ErrorLog[] {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Destroy service and clean up
   */
  destroy(): void {
    if (this.flushTimeoutId) {
      clearInterval(this.flushTimeoutId);
    }
    this.flush();
  }
}

export const errorLoggingService = ErrorLoggingService.getInstance();

/**
 * Global error handler setup
 */
export function setupErrorHandling(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Handle uncaught errors
  window.addEventListener('error', (event: ErrorEvent) => {
    errorLoggingService.log(
      event.message,
      'uncaught_error',
      event.error?.stack,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error ? event.reason.message : String(event.reason);

    errorLoggingService.log(
      message,
      'unhandled_rejection',
      event.reason instanceof Error ? event.reason.stack : undefined,
      {
        reason: event.reason,
      }
    );
  });

  // Flush logs before page unload
  window.addEventListener('beforeunload', () => {
    errorLoggingService.flush();
  });
}
