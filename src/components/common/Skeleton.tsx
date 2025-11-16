'use client';

import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  /**
   * Width of the skeleton
   */
  width?: string | number;

  /**
   * Height of the skeleton
   */
  height?: string | number;

  /**
   * Shape: 'rect' | 'circle' | 'text'
   */
  shape?: 'rect' | 'circle' | 'text';

  /**
   * Animation type: 'pulse' | 'wave' | 'none'
   */
  animation?: 'pulse' | 'wave' | 'none';

  /**
   * Number of lines (for text shape)
   */
  lines?: number;

  /**
   * Border radius
   */
  borderRadius?: string | number;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Margin
   */
  margin?: string | number;
}

/**
 * Skeleton UI component for placeholder content while loading
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  shape = 'rect',
  animation = 'pulse',
  lines = 1,
  borderRadius,
  className,
  margin,
}) => {
  const getStyleValue = (value: string | number | undefined): string => {
    if (value === undefined) return '';
    return typeof value === 'number' ? `${value}px` : value;
  };

  const skeletonStyle: React.CSSProperties = {
    width: getStyleValue(width),
    height: getStyleValue(height),
    margin: getStyleValue(margin),
    borderRadius:
      borderRadius !== undefined
        ? getStyleValue(borderRadius)
        : shape === 'circle'
          ? '50%'
          : '4px',
  };

  if (shape === 'text' && lines > 1) {
    return (
      <div className={`${styles.skeleton} ${styles[`animation-${animation}`]} ${className || ''}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={styles.textLine}
            style={{
              ...skeletonStyle,
              marginBottom: i < lines - 1 ? '8px' : '0',
              width: i === lines - 1 ? '80%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[`shape-${shape}`]} ${styles[`animation-${animation}`]} ${className || ''}`}
      style={skeletonStyle}
      role="progressbar"
      aria-label="Loading content"
    />
  );
};

export default Skeleton;
