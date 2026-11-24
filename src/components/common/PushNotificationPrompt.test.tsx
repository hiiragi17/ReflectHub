import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockShowToast, pushClient, permission } = vi.hoisted(() => {
  // getPushPermission が返す値。requestPushPermission で granted に変わる
  const permission = { current: 'default' as NotificationPermission };
  return {
    mockShowToast: vi.fn(),
    permission,
    pushClient: {
      isPushSupported: vi.fn(() => true),
      getPushPermission: vi.fn(() => permission.current),
      requestPushPermission: vi.fn(async () => {
        permission.current = 'granted';
        return 'granted' as const;
      }),
      subscribeToPush: vi.fn(async () => ({
        endpoint: 'https://push.example/abc',
        p256dh: 'p256',
        auth: 'authkey',
      })),
    },
  };
});

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
vi.mock('@/hooks/useCSRFToken', () => ({
  useCSRFToken: () => ({ withCSRFHeader: (headers: HeadersInit) => headers }),
}));
vi.mock('@/lib/push/client', () => pushClient);

import { PushNotificationPrompt } from './PushNotificationPrompt';

describe('PushNotificationPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    permission.current = 'default';
    global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as typeof fetch;
  });

  it('許可がまだ決まっていなければ表示する', () => {
    render(<PushNotificationPrompt vapidPublicKey="key" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('過去に閉じていれば表示しない', () => {
    localStorage.setItem('reflecthub:push-prompt-dismissed', '1');
    render(<PushNotificationPrompt vapidPublicKey="key" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('すでに許可済みなら表示しない', () => {
    permission.current = 'granted';
    render(<PushNotificationPrompt vapidPublicKey="key" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('許可した後に登録が失敗しても、再試行できるよう表示を続ける', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: '登録失敗' }), { status: 500 }),
    ) as typeof fetch;
    render(<PushNotificationPrompt vapidPublicKey="key" />);

    fireEvent.click(screen.getByRole('button', { name: '有効にする' }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('登録失敗', 'error'));
    expect(permission.current).toBe('granted');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '有効にする' })).toBeEnabled();
  });

  it('登録に成功したら閉じる', async () => {
    render(<PushNotificationPrompt vapidPublicKey="key" />);

    fireEvent.click(screen.getByRole('button', { name: '有効にする' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockShowToast).toHaveBeenCalledWith('プッシュ通知を有効にしました。', 'success');
  });

  it('「後で」で閉じ、次回以降も表示しない', () => {
    render(<PushNotificationPrompt vapidPublicKey="key" />);
    fireEvent.click(screen.getByRole('button', { name: '後で' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('reflecthub:push-prompt-dismissed')).toBe('1');
  });
});
