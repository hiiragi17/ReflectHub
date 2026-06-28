/**
 * PWA のインストール状態・iOS 判定ヘルパー。
 *
 * Web Push は Service Worker を必要とし、特に iOS/iPadOS では
 * 「ホーム画面に追加した PWA (standalone)」でのみ通知を受け取れる。
 * 通知設定 UI やインストール促し UI で、この状態に応じた案内を出すために使う。
 */

/** ホーム画面に追加された PWA (standalone) として起動しているか。 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari の独自フラグ。
  const navAny = window.navigator as Navigator & { standalone?: boolean };
  return navAny.standalone === true;
}

/**
 * iOS / iPadOS デバイス上で動作しているかを判定する。
 *
 * iPadOS 13+ は UA が "Macintosh" を含むため、`maxTouchPoints` でタッチデバイス
 * かを併せて判定する。
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  const isMacLike = /Macintosh/.test(ua);
  const touchPoints = window.navigator.maxTouchPoints ?? 0;
  return isMacLike && touchPoints > 1;
}
