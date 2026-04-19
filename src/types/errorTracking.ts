export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export type ErrorCategory =
  | 'uncaught_error'
  | 'unhandled_rejection'
  | 'network'
  | 'offline'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'server'
  | 'unknown';

export interface ErrorTrackingContext {
  page: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  userAgent?: string;
  url: string;
}

export interface ErrorLogEntry {
  id: string;
  userId?: string;
  errorType: ErrorCategory;
  message: string;
  stack?: string;
  context: ErrorTrackingContext;
  statusCode?: number;
  severity: ErrorSeverity;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  createdAt: number;
}

export interface ErrorLogBatch {
  logs: ErrorLogEntry[];
  sessionId: string;
  batchId: string;
  sentAt: number;
}

export interface ErrorLogApiRequest {
  logs: ErrorLogEntry[];
  sessionId: string;
}

export interface ErrorLogApiResponse {
  success: boolean;
  received: number;
  message?: string;
}

export interface ErrorLogListResponse {
  logs: ErrorLogEntry[];
  total: number;
  page: number;
  perPage: number;
}
