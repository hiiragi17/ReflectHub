/**
 * アプリアイコンのバッジ (Badging API) を消す。
 *
 * バッジは、Service Worker が、プッシュ通知を受け取ったときに付ける (`public/sw.js`)。
 * アプリを開いた (見た) 時点で、未読ではなくなるため、ここで消す。
 * 対応していない環境では何もしない。
 */
export async function clearAppBadge(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
  if (typeof nav.clearAppBadge !== 'function') return;
  try {
    await nav.clearAppBadge();
  } catch (err) {
    console.warn('[badge] clearAppBadge failed', err);
  }
}
