export const VALIDATION_CONSTANTS = {
  // 文字数制限
  DEFAULT_MAX_LENGTH: 1000,
  MIN_LENGTH: 1,

  // エラーメッセージ
  MESSAGES: {
    REQUIRED: "この項目は必須です",
    MAX_LENGTH: (max: number) => `${max}文字以内で入力してください`,
    MIN_LENGTH: (min: number) => `${min}文字以上で入力してください`,
    INVALID_FORMAT: "入力形式が不正です",
    CONTAINS_HTML: "HTML タグは使用できません",
    CONTAINS_FORBIDDEN_CHARS: "使用できない文字が含まれています",
    AT_LEAST_ONE_FIELD: "どれか1つ以上のフィールドに入力してください", // 追加
  },

  // パターン（検出用のみ。実際のサニタイズは DOMPurify で実施）
  PATTERNS: {
    // HTML タグ検出（グローバルフラグなし）
    // 単一マッチ用：状態保持を避ける
    HTML_TAG: /<[^>]*>/,

    // HTML コンテンツ検出（より広い検出）
    // 任意の HTML 要素タグを検出
    CONTAINS_HTML: /<[a-z][\s\S]*>/i,

    // 制御文字（replace 用：グローバルフラグ使用 OK）
    // 同じ正規表現を反復的に使わない文脈で使用
    CONTROL_CHARS: /[\x00-\x1F\x7F]/g,
  },
};
