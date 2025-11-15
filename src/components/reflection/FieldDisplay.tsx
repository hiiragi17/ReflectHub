'use client';

import React from 'react';
import { FrameworkField } from '@/types/framework';

interface FieldDisplayProps {
  field: FrameworkField;
  value: string;
  fieldIndex?: number;
  icon?: string;
}

/**
 * FieldDisplay - Read-only field display component
 * Used in reflection detail view to show field values
 *
 * Features:
 * - Displays field label with optional icon
 * - Shows field value in read-only format
 * - Optional description text
 * - Preserves line breaks and formatting
 */
export const FieldDisplay: React.FC<FieldDisplayProps> = ({
  field,
  value,
  fieldIndex = 0,
  icon,
}) => {
  const sanitizeId = (str: string): string => {
    const sanitized = str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/^(\d)/, 'field-$1');
    return sanitized || 'field';
  };

  const fieldId = field.id
    ? sanitizeId(field.id)
    : `field-${sanitizeId(field.label)}-${fieldIndex}`;

  // Format value: preserve line breaks and basic formatting
  const formattedValue = value
    .split('\n')
    .map((line, idx) => (
      <div key={idx} className="whitespace-pre-wrap">
        {line || '\u00A0'}
      </div>
    ));

  return (
    <div className="space-y-2">
      {/* Label section */}
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <label
          htmlFor={fieldId}
          className="text-sm font-semibold text-gray-700"
        >
          {field.label}
        </label>
      </div>

      {/* Description */}
      {field.description && (
        <p className="text-xs text-gray-500 italic">
          {field.description}
        </p>
      )}

      {/* Value display */}
      <div
        id={fieldId}
        className="rounded-md bg-gray-50 p-3 text-sm text-gray-800 border border-gray-200 min-h-[60px] flex items-start"
      >
        {value ? (
          <div className="w-full">{formattedValue}</div>
        ) : (
          <span className="text-gray-400 italic">（未入力）</span>
        )}
      </div>
    </div>
  );
};
