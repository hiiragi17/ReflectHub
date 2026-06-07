/**
 * User-Agent からモバイルデバイスかを判定する。
 *
 * Web Push 通知はスマートフォンのみに配信したいため、
 * subscribe 時 / 配信時の両方でこのヘルパーを使ってフィルタする。
 *
 * UA 判定は偽装可能で完全ではないが、防御を二段にすることで
 * 一般的な PC 利用者を弾く目的としては十分。
 */

const MOBILE_UA_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile Safari|CriOS|FxiOS/i;

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return MOBILE_UA_PATTERN.test(userAgent);
}
