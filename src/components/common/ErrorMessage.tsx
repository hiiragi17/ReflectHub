'use client';

import React, { useEffect, useState } from 'react';
import { AppError, getErrorMessage, ErrorType } from '@/utils/errorHandler';
import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  error: AppError;
  onRetry?: () => void;
  onAutoReset?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoHideDuration?: number;
}

/**
 * Error Message component for displaying error messages to users
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onAutoReset,
  dismissible = true,
  onDismiss,
  autoHideDuration,
}) => {
  const [visible, setVisible] = useState(true);
  const userMessage = getErrorMessage(error);

  useEffect(() => {
    onAutoReset?.();

    // Auto-hide if duration is specified
    if (autoHideDuration && autoHideDuration > 0) {
      const timeoutId = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoHideDuration);

      return () => clearTimeout(timeoutId);
    }
  }, [autoHideDuration, onDismiss, onAutoReset]);

  const handleDismiss = (): void => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) {
    return null;
  }

  const errorIcon = getErrorIcon(error.type);
  const severity = getErrorSeverity(error.type);

  return (
    <div
      className={`${styles.errorMessage} ${styles[`severity-${severity}`]}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.content}>
        <div className={styles.iconSection}>
          <span className={styles.icon} aria-hidden="true">
            {errorIcon}
          </span>
        </div>

        <div className={styles.messageSection}>
          <h3 className={styles.title}>{getErrorTitle(error.type)}</h3>
          <p className={styles.message}>{userMessage}</p>

          {process.env.NODE_ENV === 'development' && error.originalError ? (
            <details className={styles.debugInfo}>
              <summary>Debug Information</summary>
              <pre className={styles.debugDetails}>
                {error.message}
                {error.originalError instanceof Error &&
                  `\n${error.originalError.stack}`}
              </pre>
            </details>
          ) : null}
        </div>

        <div className={styles.actions}>
          {onRetry && (
            <button
              onClick={onRetry}
              className={styles.button}
              aria-label="Retry"
            >
              再試行
            </button>
          )}

          {dismissible && (
            <button
              onClick={handleDismiss}
              className={styles.buttonClose}
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Get error icon based on error type
 */
function getErrorIcon(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
    case ErrorType.OFFLINE:
      return '🔌';
    case ErrorType.VALIDATION:
      return '⚠️';
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
      return '🔒';
    case ErrorType.NOT_FOUND:
      return '❓';
    case ErrorType.SERVER:
      return '⚡';
    default:
      return '❌';
  }
}

/**
 * Get error severity level
 */
function getErrorSeverity(type: ErrorType): 'error' | 'warning' | 'info' {
  switch (type) {
    case ErrorType.VALIDATION:
      return 'warning';
    case ErrorType.OFFLINE:
      return 'info';
    case ErrorType.SERVER:
    case ErrorType.NETWORK:
      return 'error';
    default:
      return 'error';
  }
}

/**
 * Get error title based on error type
 */
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'ネットワークエラー';
    case ErrorType.OFFLINE:
      return 'オフラインです';
    case ErrorType.VALIDATION:
      return '入力エラー';
    case ErrorType.AUTHENTICATION:
      return 'ログインが必要です';
    case ErrorType.AUTHORIZATION:
      return 'アクセス拒否';
    case ErrorType.NOT_FOUND:
      return 'リソースが見つかりません';
    case ErrorType.SERVER:
      return 'サーバーエラー';
    default:
      return 'エラーが発生しました';
  }
}

export default ErrorMessage;
