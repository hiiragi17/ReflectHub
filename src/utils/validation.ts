/**
 * バリデーション関数群
 */

/**
 * HTMLタグを除去（サニタイズ）
 */
export const sanitizeHtml = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    .trim();
};

/**
 * 必須フィールドをチェック
 */
export const isRequired = (value: string | undefined): boolean => {
  return !!value && value.trim().length > 0;
};

/**
 * 文字数をチェック
 */
export const checkLength = (
  value: string,
  maxLength: number
): { isValid: boolean; message?: string } => {
  if (value.length > maxLength) {
    return {
      isValid: false,
      message: `${maxLength}文字以内で入力してください（現在: ${value.length}文字）`,
    };
  }
  return { isValid: true };
};

/**
 * 禁止文字をチェック
 */
export const containsForbiddenCharacters = (value: string): boolean => {
  // 例：制御文字などを検出
  const forbiddenPattern = /[\x00-\x1F\x7F]/g;
  return forbiddenPattern.test(value);
};

/**
 * XSS対策：スクリプトタグをチェック
 */
export const containsScriptTag = (value: string): boolean => {
  return /<script|<iframe|javascript:/i.test(value);
};

/**
 * フィールド全体をバリデーション
 */
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * 単一フィールドの検証
 */
export const validateField = (
  fieldId: string,
  value: string,
  isRequired: boolean,
  maxLength: number
): ValidationError | null => {
  // 必須チェック
  if (isRequired && !value.trim()) {
    return {
      field: fieldId,
      message: 'この項目は必須です',
    };
  }

  // 文字数チェック
  if (value.length > maxLength) {
    return {
      field: fieldId,
      message: `${maxLength}文字以内で入力してください`,
    };
  }

  // XSS チェック
  if (containsScriptTag(value)) {
    return {
      field: fieldId,
      message: 'スクリプトタグは使用できません',
    };
  }

  // 禁止文字チェック
  if (containsForbiddenCharacters(value)) {
    return {
      field: fieldId,
      message: '使用できない文字が含まれています',
    };
  }

  return null;
};

/**
 * 複数フィールドの検証
 */
export const validateForm = (
  formData: Record<string, string>,
  schema: Array<{
    id: string;
    label: string;
    required: boolean;
    max_length: number;
  }>
): ValidationResult => {
  const errors: ValidationError[] = [];

  schema.forEach((field) => {
    const value = formData[field.id] || '';
    const error = validateField(field.id, value, field.required, field.max_length);

    if (error) {
      errors.push(error);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};