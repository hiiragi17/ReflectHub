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
  /** 保存時の検証エラー。指定するとこの項目の下に表示する */
  error?: string;
}

export default function DynamicField({
  field,
  value,
  onChange,
  fieldIndex = 0,
  error,
}: DynamicFieldProps) {
  const maxLength =
    field.max_length ?? DYNAMIC_FIELD_CONSTANTS.DEFAULT_MAX_LENGTH;
  const characterCount = value.length;
  const overBy = characterCount - maxLength;
  const isOverLimit = overBy > 0;
  const isNearLimit =
    !isOverLimit &&
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
  const errorId = `${fieldId}-error`;

  // 上限を超える入力（貼り付けなど）を黙って捨てず、そのまま受け付けて
  // 超過数を表示する。超過したままでは保存時の検証で止まる。
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const describedBy = [
    countId,
    isNearLimit || isOverLimit ? warningId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

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
            isNearLimit || isOverLimit
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
        aria-describedby={describedBy}
        aria-invalid={isOverLimit || !!error}
      />

      {/* 警告メッセージ */}
      {(isNearLimit || isOverLimit) && (
        <p
          id={warningId}
          className={DYNAMIC_FIELD_CONSTANTS.CLASS_NAMES.WARNING_MESSAGE}
          role="alert"
        >
          {isOverLimit
            ? `${overBy}文字超えています。${maxLength}文字以内に減らしてください。`
            : DYNAMIC_FIELD_CONSTANTS.LABELS.NEAR_LIMIT_WARNING}
        </p>
      )}

      {/* 保存時の検証エラー（上限超過は上の警告で説明済みのため重複表示しない） */}
      {error && !isOverLimit && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
