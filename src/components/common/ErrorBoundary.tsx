'use client';

import React, { ReactNode } from 'react';
import { createAppError, AppError, getErrorMessage } from '@/utils/errorHandler';
import ErrorMessage from './ErrorMessage';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError) => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  error: AppError | null;
  hasError: boolean;
}

/**
 * Error Boundary component for catching and handling errors in React components
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = createAppError(error);
    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const appError = createAppError(error);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError);
    }

    // Log additional error info in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;

    // Reset error boundary if resetKeys changed
    if (resetKeys && prevProps.resetKeys !== resetKeys) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleAutoReset = (): void => {
    // Auto-reset after 5 seconds if not already reset
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.handleReset();
    }, 5000);
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="error-boundary-container">
          {this.props.fallback ? (
            this.props.fallback
          ) : (
            <ErrorMessage
              error={this.state.error}
              onRetry={this.handleReset}
              onAutoReset={this.handleAutoReset}
            />
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
