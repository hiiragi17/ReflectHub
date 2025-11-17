'use client';

import React, { useEffect, useState } from 'react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

/**
 * Individual Toast component
 */
const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (message.duration !== undefined && message.duration > 0) {
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(message.id), 300);
      }, message.duration);

      return () => clearTimeout(timeoutId);
    }
  }, [message.duration, message.id, onDismiss]);

  const handleDismiss = (): void => {
    setIsVisible(false);
    setTimeout(() => onDismiss(message.id), 300);
  };

  return (
    <div
      className={`${styles.toast} ${styles[`type-${message.type}`]} ${isVisible ? styles.visible : styles.hidden}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.content}>
        <span className={styles.icon}>{getIcon(message.type)}</span>
        <p className={styles.message}>{message.message}</p>
      </div>

      {message.action && (
        <button
          className={styles.actionButton}
          onClick={() => {
            message.action!.onClick();
            handleDismiss();
          }}
        >
          {message.action.label}
        </button>
      )}

      <button
        className={styles.closeButton}
        onClick={handleDismiss}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
};

/**
 * Toast Container component - displays multiple toasts
 */
interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  messages,
  onDismiss,
}) => {
  return (
    <div className={styles.container} role="region" aria-label="Notifications">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

/**
 * Get icon for toast type
 */
function getIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    default:
      return '→';
  }
}

export default Toast;
