/**
 * サーバー側でユーザー入力をサニタイズするユーティリティ。
 *
 * クライアント側 (`src/utils/validation.ts`) では DOMPurify を通しているが、
 * DOMPurify は実行に DOM (window) が必要なため Node ランタイムの API ルートでは
 * 使いづらい。プレーンテキストとして保存したいフィールドに関しては、
 * 「タグ・コメント・制御文字を除去する」だけで十分なので軽量な実装を提供する。
 *
 * Markdown 等の安全なリッチテキストを通したいフィールドは別途専用の
 * サニタイザを用意すること。本関数は「プレーンテキストとして安全」を保証する。
 */

// HTML タグ (開閉) と HTML コメントをまとめて除去
const HTML_TAG_OR_COMMENT = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^<>]*>/g;
// 制御文字 (\n \r \t は許容)
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizePlainText(value: string): string {
  if (typeof value !== 'string') return '';
  return value.replace(HTML_TAG_OR_COMMENT, '').replace(CONTROL_CHARS, '').trim();
}
