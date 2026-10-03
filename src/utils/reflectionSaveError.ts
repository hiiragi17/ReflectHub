import type { ErrorCategory } from "@/types/errorTracking";

/**
 * 振り返り保存の失敗を、利用者向けの文言（原因 + 次の行動）に変換する。
 * 生のエラーメッセージや詳細 JSON は画面に出さない。
 * 診断用の記録は useReflectionMutation が errorTrackingClient へ送る。
 */

const KEEP_NOTE = "入力内容は画面に残っています。";

const AUTH_CODES = new Set(["USER_NOT_AUTHENTICATED", "AUTH_ERROR"]);

const NETWORK_PATTERN = /failed to fetch|network|load failed|timeout|timed out/i;

interface SaveErrorLike {
  code?: string;
  message?: string;
}

/** 失敗の種類。画面の文言とエラー記録の分類を、同じ判定にそろえる */
export function classifySaveError(
  error: SaveErrorLike | null | undefined,
  isOnline: boolean = true
): Extract<ErrorCategory, "authentication" | "offline" | "network" | "server"> {
  if (error?.code && AUTH_CODES.has(error.code)) return "authentication";
  if (!isOnline) return "offline";
  if (error?.message && NETWORK_PATTERN.test(error.message)) return "network";
  return "server";
}

export function getSaveErrorMessage(
  error: SaveErrorLike | null | undefined,
  isOnline: boolean = true
): string {
  const kind = classifySaveError(error, isOnline);

  if (kind === "authentication") {
    return `ログイン状態を確認できませんでした。${KEEP_NOTE}もう一度「保存する」を押してください。それでも失敗する場合は、内容をコピーしてからページを再読み込みし、ログインし直してください。`;
  }

  if (kind === "offline" || kind === "network") {
    return `通信に失敗しました。${KEEP_NOTE}接続を確認して、もう一度「保存する」を押してください。`;
  }

  return `保存できませんでした。${KEEP_NOTE}少し待ってから、もう一度「保存する」を押してください。`;
}
