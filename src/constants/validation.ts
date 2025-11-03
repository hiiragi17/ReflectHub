/**
 * バリデーション定数
 */

export const VALIDATION_CONSTANTS = {
  // パターン定義
  PATTERNS: {
    // 禁止する制御文字
    // \x0A (LF) と \x0D (CR) は許可
    CONTROL_CHARS: /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g,
    
    // HTML タグ検出
    CONTAINS_HTML: /<[^>]*>/,
  },

  // メッセージ定義
  MESSAGES: {
    REQUIRED: 'この項目は必須です',
    MAX_LENGTH: (max: number) => `${max}文字以内で入力してください`,
    CONTAINS_HTML: 'HTML タグは使用できません',
    CONTAINS_FORBIDDEN_CHARS: '使用できない文字が含まれています',
  },

  // デフォルト値
  DEFAULT_MAX_LENGTH: 1000,
};