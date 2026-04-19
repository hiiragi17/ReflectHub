'use client';

import React from 'react';

interface ServiceUnavailableProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * Fallback UI displayed when a service or feature is temporarily unavailable.
 * Used for graceful degradation when backend services cannot be reached.
 */
const ServiceUnavailable: React.FC<ServiceUnavailableProps> = ({
  title = 'サービスが利用できません',
  message = 'このサービスは一時的に利用できない状態です。しばらく時間をおいてから再度お試しください。',
  onRetry,
  showRetry = true,
}) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
    >
      <span className="text-4xl" aria-hidden="true">
        🔧
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          再試行
        </button>
      )}
    </div>
  );
};

export default ServiceUnavailable;
