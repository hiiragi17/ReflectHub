// ReflectHub Service Worker
// Web Push 通知の受信とクリック処理

const DEFAULT_TITLE = 'ReflectHub';
const DEFAULT_BODY = '今日の振り返りを記録しましょう。';
const DEFAULT_ICON = '/favicon.ico';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: DEFAULT_TITLE, body: event.data.text() };
    }
  }

  const title = payload.title || DEFAULT_TITLE;
  const options = {
    body: payload.body || DEFAULT_BODY,
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_ICON,
    data: {
      url: payload.url || '/dashboard',
    },
    tag: payload.tag || 'reflecthub-reminder',
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const destination = new URL(targetUrl, self.location.origin).href;
      for (const client of clientList) {
        if (client.url === destination && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(destination);
      }
      return undefined;
    }),
  );
});
