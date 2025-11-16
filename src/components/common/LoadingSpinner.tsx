'use client';

import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner: 'small' | 'medium' | 'large'
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Loading message to display
   */
  message?: string;

  /**
   * Whether to show full screen overlay
   */
  fullScreen?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Aria label for accessibility
   */
  ariaLabel?: string;
}

/**
 * Loading Spinner component for showing loading states
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullScreen = false,
  className,
  ariaLabel = 'Loading',
}) => {
  const spinnerContent = (
    <div
      className={`${styles.spinner} ${styles[`size-${size}`]} ${className || ''}`}
      role="status"
      aria-label={ariaLabel}
    >
      <div className={styles.ring}></div>
      <div className={styles.ring}></div>
      <div className={styles.ring}></div>
      <div className={styles.ring}></div>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={styles.fullScreenContainer}>
        <div className={styles.overlay}></div>
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
