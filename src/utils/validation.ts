import { VALIDATION_CONSTANTS } from '@/constants/validation';
import DOMPurify from 'dompurify';
import GraphemeSplitter from 'grapheme-splitter';

const splitter = new GraphemeSplitter();

export const sanitizeHtml = (text: string): string => {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }).trim();
};

export const isRequired = (value: string | undefined): boolean => {
  return !!value && value.trim().length > 0;
};

export const checkLength = (
  value: string,
  maxLength: number
): { isValid: boolean; message?: string } => {
  const graphemeLength = splitter.countGraphemes(value);

  if (graphemeLength > maxLength) {
    return {
      isValid: false,
      message: VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(maxLength),
    };
  }
  return { isValid: true };
};

export const containsForbiddenCharacters = (value: string): boolean => {
  return VALIDATION_CONSTANTS.PATTERNS.CONTROL_CHARS.test(value);
};

export const containsHtmlContent = (value: string): boolean => {
  return VALIDATION_CONSTANTS.PATTERNS.CONTAINS_HTML.test(value);
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateField = (
  fieldId: string,
  value: string,
  required: boolean,
  maxLength: number
): ValidationError | null => {
  // 必須チェック（ヘルパー関数を使用）
  if (required && !isRequired(value)) {
    return {
      field: fieldId,
      message: VALIDATION_CONSTANTS.MESSAGES.REQUIRED,
    };
  }

  // 値が空の場合、以降のチェックをスキップ
  if (!isRequired(value)) {
    return null;
  }

  // 文字数チェック（ヘルパー関数を使用）
  const lengthCheck = checkLength(value, maxLength);
  if (!lengthCheck.isValid) {
    return {
      field: fieldId,      message: lengthCheck.message || VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(maxLength),
    };
  }

  // HTML コンテンツ検出（バリデーション用）
  if (containsHtmlContent(value)) {
    return {
      field: fieldId,
      message: VALIDATION_CONSTANTS.MESSAGES.CONTAINS_HTML,
    };
  }

  // 禁止文字チェック
  if (containsForbiddenCharacters(value)) {
    return {
      field: fieldId,
      message: VALIDATION_CONSTANTS.MESSAGES.CONTAINS_FORBIDDEN_CHARS,
    };
  }

  return null;
};

export const hasAtLeastOneValue = (formData: Record<string, string>): boolean => {
  return Object.values(formData).some((value) => isRequired(value));
};

export const validateForm = (
  formData: Record<string, string>,
  schema: Array<{
    id: string;
    label?: string;
    required?: boolean;
    max_length?: number;
  }>
): ValidationResult => {
  const errors: ValidationError[] = [];

  schema.forEach((field) => {
    const value = formData[field.id] || '';
    const error = validateField(
      field.id,
      value,
      field.required ?? false,
      field.max_length ?? VALIDATION_CONSTANTS.DEFAULT_MAX_LENGTH
    );

    if (error) {
      errors.push(error);
    }
  });

  if (!hasAtLeastOneValue(formData)) {
    errors.push({
      field: '__form__',
      message: 'どれか1つ以上のフィールドに入力してください',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};