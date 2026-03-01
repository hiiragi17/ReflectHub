// ReflectHub Service Worker
const CACHE_NAME = 'reflecthub-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// インストール時: 静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベーション時: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// フェッチ時: Stale-While-Revalidate 戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API リクエストはネットワーク優先
  if (request.url.includes('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ナビゲーションリクエストはネットワーク優先（フォールバックあり）
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静的アセットは SWR
  event.respondWith(staleWhileRevalidate(request));
});

// ネットワーク優先戦略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // オフライン時のナビゲーションはダッシュボードにフォールバック
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/dashboard');
      if (fallback) return fallback;
    }

    return new Response('オフラインです', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// Stale-While-Revalidate 戦略
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// プッシュ通知受信
self.addEventListener('push', (event) => {
  let data = { title: 'ReflectHub', body: '今週の振り返りを始めましょう！' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'reflecthub-notification',
    data: { url: data.url || '/dashboard' },
    actions: data.actions || [
      { action: 'open', title: '振り返りを開始' },
      { action: 'dismiss', title: '閉じる' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 既存のウィンドウがあればフォーカス
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // なければ新しいウィンドウを開く
      return self.clients.openWindow(url);
    })
  );
});
