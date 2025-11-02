'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FrameworkField } from '@/types/framework';
import { DYNAMIC_FIELD_CONSTANTS } from '@/constants/dynamicField';

interface DynamicFieldProps {
  field: FrameworkField;
  value: string;
  onChange: (value: string) => void;
}

export default function DynamicField({
  field,
  value,
  onChange,
}: DynamicFieldProps) {
  const maxLength = field.max_length || DYNAMIC_FIELD_CONSTANTS.DEFAULT_MAX_LENGTH;
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * DYNAMIC_FIELD_CONSTANTS.NEAR_LIMIT_THRESHOLD;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.LABEL}>
          {field.label}
          {field.required && (
            <span className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.REQUIRED_INDICATOR}>
              *
            </span>
          )}
        </Label>
        <span
          className={`${DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.CHARACTER_COUNT} ${
            isNearLimit
              ? DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.CHARACTER_COUNT_NEAR_LIMIT
              : DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.CHARACTER_COUNT_NORMAL
          }`}
        >
          {characterCount} / {maxLength}
        </span>
      </div>

      <Textarea
        placeholder={field.placeholder}
        value={value}
        onChange={handleChange}
        className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.TEXTAREA}
      />

      {isNearLimit && (
        <p className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.WARNING_MESSAGE}>
          {DYNAMIC_FIELD_CONSTANTS.LABELS.NEAR_LIMIT_WARNING}
        </p>
      )}
    </div>
  );
}