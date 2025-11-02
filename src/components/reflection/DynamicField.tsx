"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FrameworkField } from "@/types/framework";
import { DYNAMIC_FIELD_CONSTANTS } from "@/constants/dynamicField";

interface DynamicFieldProps {
  field: FrameworkField;
  value: string;
  onChange: (value: string) => void;
  fieldIndex?: number;
}

export default function DynamicField({
  field,
  value,
  onChange,
  fieldIndex = 0,
}: DynamicFieldProps) {
  const maxLength =
    field.max_length ?? DYNAMIC_FIELD_CONSTANTS.DEFAULT_MAX_LENGTH;
  const characterCount = value.length;
  const isNearLimit =
    characterCount > maxLength * DYNAMIC_FIELD_CONSTANTS.NEAR_LIMIT_THRESHOLD;

  const sanitizeId = (str: string): string => {
    const sanitized = str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/^(\d)/, "field-$1");
    return sanitized || "field";
  };

  const fieldId = field.id
    ? sanitizeId(field.id)
    : `field-${sanitizeId(field.label)}-${fieldIndex}`;

  const countId = `${fieldId}-count`;
  const warningId = `${fieldId}-warning`;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      {/* ラベル部分 */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={fieldId}
          className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.LABEL}
        >
          {field.label}
          {field.required && (
            <span
              className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.REQUIRED_INDICATOR}
            >
              *
            </span>
          )}
        </Label>

        {/* 文字数カウンター */}
        <span
          id={countId}
          className={`${DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.CHARACTER_COUNT} ${
            isNearLimit
              ? DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.CHARACTER_COUNT_NEAR_LIMIT
              : DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.CHARACTER_COUNT_NORMAL
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {characterCount} / {maxLength}
        </span>
      </div>

      {/* テキスト入力欄 */}
      <Textarea
        id={fieldId}
        placeholder={field.placeholder}
        value={value}
        onChange={handleChange}
        className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.TEXTAREA}
        required={field.required}
        aria-describedby={`${countId}${isNearLimit ? ` ${warningId}` : ""}`}
      />

      {/* 警告メッセージ */}
      {isNearLimit && (
        <p
          id={warningId}
          className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.WARNING_MESSAGE}
          role="alert"
        >
          {DYNAMIC_FIELD_CONSTANTS.LABELS.NEAR_LIMIT_WARNING}
        </p>
      )}
    </div>
  );
}
