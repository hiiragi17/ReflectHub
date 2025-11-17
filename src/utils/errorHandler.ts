/**
 * Error handling utility
 * Provides unified error handling across the application
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  OFFLINE = 'OFFLINE',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  originalError?: Error | unknown;
  timestamp: number;
  isDev?: boolean;
}

/**
 * Error logger for collecting error information
 */
class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: AppError[] = [];
  private maxLogs = 100;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: AppError): void {
    this.logs.push(error);

    // Keep only the latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[AppError]', error);
    }

    // Send to external service in production (optional)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendToServer(error);
    }
  }

  private sendToServer(error: AppError): void {
    // TODO: Implement server-side error logging
    // Example: Send to Sentry, LogRocket, or custom endpoint
    try {
      fetch('/api/logs/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      }).catch(() => {
        // Silently fail if logging fails
      });
    } catch {
      // Ignore errors during logging
    }
  }

  getLogs(): AppError[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Classify error type based on error object or status code
 */
function classifyError(error: unknown, statusCode?: number): ErrorType {
  // Check for offline
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return ErrorType.OFFLINE;
  }

  // Check status code
  if (statusCode) {
    if (statusCode === 401) return ErrorType.AUTHENTICATION;
    if (statusCode === 403) return ErrorType.AUTHORIZATION;
    if (statusCode === 404) return ErrorType.NOT_FOUND;
    if (statusCode >= 500) return ErrorType.SERVER;
    if (statusCode >= 400) return ErrorType.VALIDATION;
  }

  // Check error message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('request') ||
      message.includes('timeout')
    ) {
      return ErrorType.NETWORK;
    }
    if (message.includes('offline')) {
      return ErrorType.OFFLINE;
    }
    if (message.includes('validation')) {
      return ErrorType.VALIDATION;
    }
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'ネットワーク接続エラーが発生しました。インターネット接続を確認してください。';
    case ErrorType.OFFLINE:
      return 'オフラインです。インターネット接続が必要です。';
    case ErrorType.VALIDATION:
      return 'ご入力の内容に誤りがあります。確認してください。';
    case ErrorType.AUTHENTICATION:
      return 'ログインが必要です。もう一度ログインしてください。';
    case ErrorType.AUTHORIZATION:
      return 'このアクションを実行する権限がありません。';
    case ErrorType.NOT_FOUND:
      return 'リクエストされたリソースが見つかりません。';
    case ErrorType.SERVER:
      return 'サーバーエラーが発生しました。しばらく後にお試しください。';
    case ErrorType.UNKNOWN:
    default:
      return error.message || '予期しないエラーが発生しました。';
  }
}

/**
 * Create an AppError from an unknown error source
 */
export function createAppError(
  error: unknown,
  statusCode?: number,
  customMessage?: string
): AppError {
  const type = classifyError(error, statusCode);
  let message = customMessage || '';

  if (error instanceof Error) {
    message = message || error.message;
  } else if (typeof error === 'string') {
    message = message || error;
  }

  const appError: AppError = {
    type,
    message: message || getErrorMessage({ type, message: '' } as AppError),
    statusCode,
    originalError: error,
    timestamp: Date.now(),
    isDev: process.env.NODE_ENV === 'development',
  };

  // Log the error
  ErrorLogger.getInstance().log(appError);

  return appError;
}

/**
 * Handle network request errors
 */
export async function handleFetchError(
  response: Response,
  customMessage?: string
): Promise<AppError> {
  let message = customMessage || '';

  try {
    const data = await response.json();
    message = message || data.message || data.error;
  } catch {
    message = message || response.statusText;
  }

  return createAppError(
    new Error(message || `HTTP ${response.status}`),
    response.status,
    message
  );
}

/**
 * Retry logic for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed');
}

/**
 * Export error logger instance
 */
export const errorLogger = ErrorLogger.getInstance();
