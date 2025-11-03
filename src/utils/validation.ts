/**
 * バリデーション関数群（改行正規化対応）
 *
 * 仕様:
 * - Windows の改行（\r\n）を正規化（\n に統一）
 * - 各フィールド：individual validation
 * - フォーム全体：最低1つのフィールドに値が必要
 */

import { VALIDATION_CONSTANTS } from '@/constants/validation';
import DOMPurify from 'dompurify';
import GraphemeSplitter from 'grapheme-splitter';

const splitter = new GraphemeSplitter();

/**
 * Windows 改行（\r）を正規化
 * \r\n → \n に統一
 *
 * @param text 正規化前のテキスト
 * @returns 正規化後のテキスト（改行は \n に統一）
 */
export const normalizeLineBreaks = (text: string): string => {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

/**
 * HTMLタグを除去（サニタイズ）
 * DOMPurify を使用して確実に XSS を防止
 *
 * @param text サニタイズ前のテキスト
 * @returns サニタイズ後のテキスト（タグなし）
 */
export const sanitizeHtml = (text: string): string => {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }).trim();
};

/**
 * 必須フィールドをチェック
 *
 * @param value チェック対象の値
 * @returns 値が存在し空でない場合 true
 */
export const isRequired = (value: string | undefined): boolean => {
  return !!value && value.trim().length > 0;
};

/**
 * 文字数をチェック（grapheme対応）
 * 複雑な絵文字も正確にカウント
 *
 * @param value チェック対象の値
 * @param maxLength 最大文字数
 * @returns 検証結果
 */
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

/**
 * 禁止文字をチェック
 *
 * @param value チェック対象の値
 * @returns 禁止文字が含まれている場合 true
 */
export const containsForbiddenCharacters = (value: string): boolean => {
  return VALIDATION_CONSTANTS.PATTERNS.CONTROL_CHARS.test(value);
};

/**
 * HTML コンテンツ検出（バリデーション用）
 *
 * @param value チェック対象の値
 * @returns HTML タグが検出された場合 true
 */
export const containsHtmlContent = (value: string): boolean => {
  return VALIDATION_CONSTANTS.PATTERNS.CONTAINS_HTML.test(value);
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
 *
 * @param fieldId フィールド ID
 * @param value 入力値
 * @param required 必須かどうか
 * @param maxLength 最大文字数
 * @returns エラーがあればValidationError、なければ null
 */
export const validateField = (
  fieldId: string,
  value: string,
  required: boolean,
  maxLength: number
): ValidationError | null => {
  // 1️⃣ 改行を正規化（Windows の \r\n を \n に統一）
  const normalizedValue = normalizeLineBreaks(value);

  // 必須チェック（ヘルパー関数を使用）
  if (required && !isRequired(normalizedValue)) {
    return {
      field: fieldId,
      message: VALIDATION_CONSTANTS.MESSAGES.REQUIRED,
    };
  }

  // 値が空の場合、以降のチェックをスキップ
  if (!isRequired(normalizedValue)) {
    return null;
  }

  // 文字数チェック（ヘルパー関数を使用）
  const lengthCheck = checkLength(normalizedValue, maxLength);
  if (!lengthCheck.isValid) {
    return {
      field: fieldId,
      message: lengthCheck.message || VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(maxLength),
    };
  }

  // HTML コンテンツ検出（バリデーション用）
  if (containsHtmlContent(normalizedValue)) {
    return {
      field: fieldId,
      message: VALIDATION_CONSTANTS.MESSAGES.CONTAINS_HTML,
    };
  }

  // 禁止文字チェック（正規化後なので \r は検出されない）
  if (containsForbiddenCharacters(normalizedValue)) {
    return {
      field: fieldId,
      message: VALIDATION_CONSTANTS.MESSAGES.CONTAINS_FORBIDDEN_CHARS,
    };
  }

  return null;
};

/**
 * フォーム全体が空でないかチェック
 * 最低1つのフィールドに値が必要
 *
 * @param formData フォームデータ
 * @returns 最低1つのフィールドに値がある場合 true
 */
export const hasAtLeastOneValue = (formData: Record<string, string>): boolean => {
  return Object.values(formData).some((value) => isRequired(value));
};

/**
 * 複数フィールドの検証
 *
 * 仕様:
 * - 各フィールド個別のバリデーション
 * - フォーム全体で最低1つのフィールドに値が必要
 */
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

  // 1️⃣ 各フィールド個別のバリデーション
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

  // 2️⃣ フォーム全体で最低1つのフィールドに値が必要
  if (!hasAtLeastOneValue(formData)) {
    errors.push({
      field: '__form__', // スペシャルキー（フォーム全体のエラー）
      message: 'どれか1つ以上のフィールドに入力してください',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * フォームデータをサニタイズ
 * 改行正規化 + HTML タグ除去
 *
 * @param formData フォームデータ
 * @returns サニタイズ後のデータ
 */
export const sanitizeFormData = (formData: Record<string, string>): Record<string, string> => {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(formData)) {
    // 1️⃣ 改行を正規化（Windows の \r\n を \n に統一）
    let normalized = normalizeLineBreaks(value);

    // 2️⃣ HTML タグを除去
    let cleaned = sanitizeHtml(normalized);

    sanitized[key] = cleaned;
  }

  return sanitized;
};