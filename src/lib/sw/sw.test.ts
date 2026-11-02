import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

/**
 * public/sw.js を、偽の Service Worker のグローバルで実行し、
 * push / notificationclick の動きを確かめる。
 */

type Handler = (event: unknown) => void;

interface FakeClient {
  url: string;
  visibilityState: 'visible' | 'hidden';
  focus: ReturnType<typeof vi.fn>;
}

function loadServiceWorker(options: {
  clients?: FakeClient[];
  setAppBadge?: unknown;
  clearAppBadge?: unknown;
  matchAllRejects?: boolean;
}) {
  const handlers: Record<string, Handler> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const clients = options.clients ?? [];

  const navigator: Record<string, unknown> = {};
  if (options.setAppBadge !== undefined) navigator.setAppBadge = options.setAppBadge;
  if (options.clearAppBadge !== undefined) navigator.clearAppBadge = options.clearAppBadge;

  const self = {
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    registration: { showNotification },
    clients: {
      matchAll: options.matchAllRejects
        ? vi.fn().mockRejectedValue(new Error('matchAll failed'))
        : vi.fn().mockResolvedValue(clients),
      openWindow,
      claim: vi.fn(),
    },
    navigator,
    location: { origin: 'https://app.example.com' },
    skipWaiting: vi.fn(),
  };

  const context = vm.createContext({
    self,
    console: { warn: vi.fn(), log: vi.fn(), error: vi.fn() },
    URL,
    caches: {},
    Response,
    fetch: vi.fn(),
  });
  vm.runInContext(readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8'), context);

  /** イベントを発火し、waitUntil に渡された処理が終わるまで待つ。 */
  async function dispatch(type: string, event: Record<string, unknown>) {
    const pending: Promise<unknown>[] = [];
    handlers[type]({
      ...event,
      waitUntil: (p: Promise<unknown>) => pending.push(Promise.resolve(p)),
    });
    await Promise.all(pending);
  }

  return { dispatch, showNotification, openWindow, self };
}

const pushEvent = (payload: unknown = { title: 'リマインダー', body: '振り返りの時間です' }) => ({
  data: { json: () => payload, text: () => JSON.stringify(payload) },
});

const makeClient = (overrides: Partial<FakeClient> = {}): FakeClient => ({
  url: 'https://app.example.com/dashboard',
  visibilityState: 'hidden',
  focus: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Service Worker の push: アプリアイコンのバッジ', () => {
  let setAppBadge: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAppBadge = vi.fn().mockResolvedValue(undefined);
  });

  it('通知を表示し、アプリを見ていなければ、バッジを付ける', async () => {
    const sw = loadServiceWorker({ setAppBadge, clients: [makeClient({ visibilityState: 'hidden' })] });
    await sw.dispatch('push', pushEvent());

    expect(sw.showNotification).toHaveBeenCalledWith('リマインダー', expect.objectContaining({ body: '振り返りの時間です' }));
    expect(setAppBadge).toHaveBeenCalledWith(1);
  });

  it('開いているウィンドウがなくても、バッジを付ける', async () => {
    const sw = loadServiceWorker({ setAppBadge, clients: [] });
    await sw.dispatch('push', pushEvent());
    expect(setAppBadge).toHaveBeenCalledWith(1);
  });

  it('アプリを見ている最中（表示中のウィンドウがある）は、バッジを付けない。通知は表示する', async () => {
    const sw = loadServiceWorker({
      setAppBadge,
      clients: [makeClient({ visibilityState: 'hidden' }), makeClient({ visibilityState: 'visible' })],
    });
    await sw.dispatch('push', pushEvent());

    expect(sw.showNotification).toHaveBeenCalledTimes(1);
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it('Badging API に対応していない環境でも、通知は表示し、例外にならない', async () => {
    const sw = loadServiceWorker({ clients: [] });
    await expect(sw.dispatch('push', pushEvent())).resolves.toBeUndefined();
    expect(sw.showNotification).toHaveBeenCalledTimes(1);
  });

  it('setAppBadge が失敗しても、通知の表示を妨げない', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('denied'));
    const sw = loadServiceWorker({ setAppBadge: failing, clients: [] });
    await expect(sw.dispatch('push', pushEvent())).resolves.toBeUndefined();
    expect(sw.showNotification).toHaveBeenCalledTimes(1);
  });

  it('画面の状態が分からなくても（matchAll の失敗）、バッジは付ける', async () => {
    const sw = loadServiceWorker({ setAppBadge, matchAllRejects: true });
    await sw.dispatch('push', pushEvent());
    expect(setAppBadge).toHaveBeenCalledWith(1);
  });

  it('ペイロードがなくても、既定の内容で通知とバッジを出す', async () => {
    const sw = loadServiceWorker({ setAppBadge, clients: [] });
    await sw.dispatch('push', {});
    expect(sw.showNotification).toHaveBeenCalledWith('ReflectHub', expect.any(Object));
    expect(setAppBadge).toHaveBeenCalledWith(1);
  });
});

describe('Service Worker の notificationclick: バッジを消す', () => {
  const clickEvent = (url = '/dashboard') => ({
    notification: { close: vi.fn(), data: { url } },
  });

  it('通知をタップしたら、バッジを消し、該当の画面を開く', async () => {
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    const sw = loadServiceWorker({ clearAppBadge, clients: [] });
    const event = clickEvent('/reflection');
    await sw.dispatch('notificationclick', event);

    expect(event.notification.close).toHaveBeenCalled();
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
    expect(sw.openWindow).toHaveBeenCalledWith('https://app.example.com/reflection');
  });

  it('すでに開いている同じ画面があれば、それにフォーカスする（バッジは消す）', async () => {
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    const open = makeClient({ url: 'https://app.example.com/dashboard' });
    const sw = loadServiceWorker({ clearAppBadge, clients: [open] });
    await sw.dispatch('notificationclick', clickEvent('/dashboard'));

    expect(open.focus).toHaveBeenCalled();
    expect(sw.openWindow).not.toHaveBeenCalled();
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it('Badging API に対応していない環境でも、画面は開く', async () => {
    const sw = loadServiceWorker({ clients: [] });
    await sw.dispatch('notificationclick', clickEvent());
    expect(sw.openWindow).toHaveBeenCalledTimes(1);
  });

  it('clearAppBadge が失敗しても、画面は開く', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('denied'));
    const sw = loadServiceWorker({ clearAppBadge: failing, clients: [] });
    await sw.dispatch('notificationclick', clickEvent());
    expect(sw.openWindow).toHaveBeenCalledTimes(1);
  });
});
