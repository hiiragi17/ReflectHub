export const VALIDATION_CONSTANTS = {
  // 文字数制限
  DEFAULT_MAX_LENGTH: 1000,
  MIN_LENGTH: 1,

  // エラーメッセージ
  MESSAGES: {
    REQUIRED: 'この項目は必須です',
    MAX_LENGTH: (max: number) => `${max}文字以内で入力してください`,
    MIN_LENGTH: (min: number) => `${min}文字以上で入力してください`,
    INVALID_FORMAT: '入力形式が不正です',
    CONTAINS_SCRIPT: 'スクリプトタグは使用できません',
    CONTAINS_FORBIDDEN_CHARS: '使用できない文字が含まれています',
  },

  // パターン
  PATTERNS: {
    // HTML タグ
    HTML_TAG: /<[^>]*>/g,

    // スクリプト関連
    SCRIPT_TAG: /<script|<iframe|javascript:/i,

    // 制御文字
    CONTROL_CHARS: /[\x00-\x1F\x7F]/g,
  },
};