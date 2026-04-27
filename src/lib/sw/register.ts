/**
 * Service Worker 登録ヘルパー。
 *
 * - `registerServiceWorker` をクライアント側のレイアウトから呼び出す。
 * - 開発環境 (`NODE_ENV !== 'production'`) では登録しない。Next.js の HMR と
 *   競合し、キャッシュ起因の不可解な挙動の原因になりがちなため。
 * - すでに登録済みのワーカーがある場合は重複登録しない。
 * - 新しいワーカーが waiting になったら自動で `SKIP_WAITING` を送り、
 *   次回ナビゲーションで反映されるようにする。
 */

const SW_URL = '/sw.js';
const SW_SCOPE = '/';

export interface RegisterOptions {
  /** デフォルトでは production のみ登録するが、テストや検証用に強制したい場合に使う。 */
  force?: boolean;
  /** 新バージョン検出時に呼ばれる。UI でリロード促しを出す等に使う。 */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** 登録成功時に呼ばれる。 */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
}

export async function registerServiceWorker(
  options: RegisterOptions = {},
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  // 開発環境では登録しない (force で上書き可)。
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd && !options.force) return null;

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE,
    });

    // 既に waiting 中のワーカーがあれば即時アクティベート。
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          // 既存のコントローラがあるのに新たに installed = 更新あり。
          options.onUpdate?.(registration);
          installing.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    options.onSuccess?.(registration);
    return registration;
  } catch (err) {
    console.warn('[sw] registration failed', err);
    return null;
  }
}

/**
 * 登録済み Service Worker を解除する (デバッグ・テスト用)。
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const results = await Promise.all(registrations.map((r) => r.unregister()));
  return results.every(Boolean);
}
