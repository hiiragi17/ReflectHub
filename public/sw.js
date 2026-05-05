/* eslint-disable */
/**
 * ReflectHub Service Worker
 *
 * - 静的アセット (Next.js の /_next/static, public 直下のアイコンなど) は
 *   Stale-While-Revalidate でキャッシュし、オフラインでも素早く配信する。
 * - HTML ナビゲーションは Network-First にし、オフライン時のみキャッシュへ
 *   フォールバック。これにより SSR や認証保護ページの不整合を避ける。
 * - API (`/api/*`) と Supabase などの外部 POST は常にネットワーク経由
 *   (オプトインしないとキャッシュしない) としている。
 *
 * バージョン更新時は `CACHE_VERSION` を上げる。古いキャッシュは activate で
 * 削除される。
 */

const CACHE_PREFIX = 'reflecthub-';
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const HTML_CACHE = `${CACHE_PREFIX}html-${CACHE_VERSION}`;

// インストール時に確実にプリキャッシュしておきたい最小セット。
// オフライン時にもアプリシェルが起動できる程度の URL に絞っている。
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-256.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // 個別に追加して、1 つの URL が失敗してもインストールが落ちないようにする。
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            // ネットワーク不通や 404 のときに install を阻害しない。
            console.warn('[sw] precache failed:', url, err);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const expected = new Set([STATIC_CACHE, HTML_CACHE]);
      // 自アプリの旧キャッシュ (reflecthub-*) のみ削除対象とし、
      // 同一オリジン上の他機能キャッシュには触らない。
      await Promise.all(
        keys.map((key) => {
          if (!key.startsWith(CACHE_PREFIX)) return undefined;
          if (expected.has(key)) return undefined;
          return caches.delete(key);
        }),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * Stale-While-Revalidate: キャッシュがあれば即返しつつ、裏でネットワーク取得して
 * キャッシュを更新する。
 */
function shouldStoreInCache(response) {
  const cacheControl = response.headers.get('Cache-Control') || '';
  // no-store / private は機微情報を含む可能性が高いので保存しない。
  return !/\bno-store\b|\bprivate\b/i.test(cacheControl);
}

/**
 * Stale-While-Revalidate: キャッシュがあれば即返しつつ、裏でネットワーク取得して
 * キャッシュを更新する。
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (
        response &&
        response.ok &&
        response.type === 'basic' &&
        shouldStoreInCache(response)
      ) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await networkPromise) || Response.error();
}

/**
 * Network-First: ネットワーク優先で取得し、失敗時のみキャッシュにフォールバック。
 * HTML ナビゲーションに使う。
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (
      response &&
      response.ok &&
      response.type === 'basic' &&
      shouldStoreInCache(response)
    ) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // 完全オフラインで HTML キャッシュもない場合は最小限のエラーページを返す。
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
        '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
        '<h1>オフラインです</h1><p>ネットワークに接続してから再度お試しください。</p></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET 以外と非 http(s) は触らない。
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // 同一オリジンのみ扱う。クロスオリジンはブラウザに任せる。
  if (url.origin !== self.location.origin) return;

  // API リクエストは常にネットワーク (キャッシュしない)。
  if (url.pathname.startsWith('/api/')) return;

  // Next.js の HMR / Webpack 専用エンドポイントはバイパス。
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // HTML ナビゲーション (例: ブラウザ直接 URL アクセス) は Network-First。
  const acceptsHtml = request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
  if (acceptsHtml) {
    event.respondWith(networkFirst(request, HTML_CACHE));
    return;
  }

  // 静的アセット (アイコン, _next/static, manifest, 画像など) は SWR。
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 静的アセットでも HTML ナビゲーションでも API でもない GET は
  // Service Worker では扱わない。Next.js App Router の RSC ペイロード
  // (`?_rsc=` や RSC ヘッダ付き) は SWR でキャッシュすると古いルート
  // 情報を返してしまうため、キャッシュ層を通さず直接ブラウザに任せる。
});

// 新バージョンを即時反映するためのメッセージハンドラ。
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
