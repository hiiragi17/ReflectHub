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

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[AppError]', error);
    }

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendToServer(error);
    }
  }

  private sendToServer(error: AppError): void {
    try {
      fetch('/api/logs/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [
            {
              id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              errorType: error.type.toLowerCase(),
              message: error.message,
              statusCode: error.statusCode,
              severity: error.type === ErrorType.SERVER ? 'critical' : 'error',
              context: {
                page: typeof window !== 'undefined' ? window.location.pathname : '',
                url: typeof window !== 'undefined' ? window.location.href : '',
                timestamp: error.timestamp,
              },
              resolved: false,
              createdAt: error.timestamp,
            },
          ],
        }),
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

function classifyError(error: unknown, statusCode?: number): ErrorType {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return ErrorType.OFFLINE;
  }

  if (statusCode) {
    if (statusCode === 401) return ErrorType.AUTHENTICATION;
    if (statusCode === 403) return ErrorType.AUTHORIZATION;
    if (statusCode === 404) return ErrorType.NOT_FOUND;
    if (statusCode >= 500) return ErrorType.SERVER;
    if (statusCode >= 400) return ErrorType.VALIDATION;
  }

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

  ErrorLogger.getInstance().log(appError);

  return appError;
}

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
 * Retry with exponential backoff: 1s → 2s → 4s
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed');
}

/**
 * Execute an operation once the browser is back online.
 * Resolves immediately if already online; otherwise waits for the 'online' event.
 */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || window.navigator.onLine) {
      resolve();
      return;
    }

    const handler = () => {
      window.removeEventListener('online', handler);
      resolve();
    };

    window.addEventListener('online', handler);
  });
}

/**
 * Retry an operation, automatically waiting for network connectivity if offline.
 * Uses exponential backoff (1s → 2s → 4s) for network/offline errors.
 */
export async function retryWithNetworkRecovery<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (typeof window !== 'undefined' && !window.navigator.onLine) {
        await waitForOnline();
      }
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorType = classifyError(error);

      const isRecoverable =
        errorType === ErrorType.NETWORK ||
        errorType === ErrorType.OFFLINE ||
        errorType === ErrorType.SERVER;

      if (!isRecoverable || attempt >= maxRetries) break;

      if (errorType === ErrorType.OFFLINE) {
        await waitForOnline();
      } else {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed');
}

export const errorLogger = ErrorLogger.getInstance();
