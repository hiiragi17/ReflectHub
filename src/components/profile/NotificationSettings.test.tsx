import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockApiFetch, mockShowToast, pushClient, pwa } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
  mockShowToast: vi.fn(),
  pushClient: {
    isPushSupported: vi.fn(() => true),
    requestPushPermission: vi.fn(async () => 'granted'),
    subscribeToPush: vi.fn(async () => ({
      endpoint: 'https://push.example/abc',
      p256dh: 'p256',
      auth: 'authkey',
    })),
    unsubscribeFromPush: vi.fn(async () => 'https://push.example/abc'),
  },
  pwa: {
    isIOSDevice: vi.fn(() => false),
    isStandaloneDisplay: vi.fn(() => false),
  },
}));

vi.mock('@/lib/api/apiClient', () => ({ apiFetch: mockApiFetch }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
vi.mock('@/lib/push/client', () => pushClient);
vi.mock('@/lib/pwa/standalone', () => pwa);

import { NotificationSettings } from './NotificationSettings';

/** apiFetch のデフォルト挙動: GET /api/preferences は指定 weekday を返し、それ以外は ok。 */
function mockPreferencesApi(reminderWeekday: number | null) {
  mockApiFetch.mockImplementation((url: string, init?: { method?: string }) => {
    const method = init?.method ?? 'GET';
    if (url === '/api/preferences' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          preferences: { notification_preferences: { reminder_weekday: reminderWeekday } },
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

const getSelect = () => screen.getByLabelText('通知する曜日') as HTMLSelectElement;

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-key';
    pushClient.isPushSupported.mockReturnValue(true);
    pushClient.requestPushPermission.mockResolvedValue('granted');
    pushClient.unsubscribeFromPush.mockResolvedValue('https://push.example/abc');
    pwa.isIOSDevice.mockReturnValue(false);
    pwa.isStandaloneDisplay.mockReturnValue(false);
  });

  it('always shows the install requirement note', async () => {
    mockPreferencesApi(null);
    render(<NotificationSettings />);
    await waitFor(() => expect(getSelect()).toBeInTheDocument());
    expect(screen.getByText('📱 プッシュ通知を受け取るには')).toBeInTheDocument();
  });

  it('warns iOS users who have not installed the app to the home screen', async () => {
    pwa.isIOSDevice.mockReturnValue(true);
    pwa.isStandaloneDisplay.mockReturnValue(false);
    mockPreferencesApi(null);
    render(<NotificationSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent('ホーム画面に追加');
  });

  it('does not warn when running as an installed PWA on iOS', async () => {
    pwa.isIOSDevice.mockReturnValue(true);
    pwa.isStandaloneDisplay.mockReturnValue(true);
    mockPreferencesApi(2);
    render(<NotificationSettings />);
    await waitFor(() => expect(getSelect()).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('loads and shows the current reminder weekday', async () => {
    mockPreferencesApi(2); // 火曜日
    render(<NotificationSettings />);

    await waitFor(() => expect(getSelect()).toBeInTheDocument());
    expect(getSelect().value).toBe('2');
  });

  it('shows an error message when loading fails', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<NotificationSettings />);

    expect(await screen.findByText('通知設定の取得に失敗しました。')).toBeInTheDocument();
  });

  it('keeps the save button disabled until the value changes', async () => {
    mockPreferencesApi(null); // OFF
    render(<NotificationSettings />);

    await waitFor(() => expect(getSelect()).toBeInTheDocument());
    const saveButton = screen.getByRole('button', { name: '保存' });
    expect(saveButton).toBeDisabled();

    fireEvent.change(getSelect(), { target: { value: '3' } });
    expect(saveButton).not.toBeDisabled();
  });

  it('subscribes to push and persists the weekday when enabling', async () => {
    mockPreferencesApi(null); // OFF 初期
    render(<NotificationSettings />);
    await waitFor(() => expect(getSelect()).toBeInTheDocument());

    fireEvent.change(getSelect(), { target: { value: '1' } }); // 月曜日
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(pushClient.subscribeToPush).toHaveBeenCalled();
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/push/subscribe',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/preferences',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"reminder_weekday":1'),
      }),
    );
    expect(mockShowToast).toHaveBeenCalledWith('通知設定を保存しました。', 'success');
  });

  it('unsubscribes from push and persists null when turning OFF', async () => {
    mockPreferencesApi(3); // 水曜日 初期
    render(<NotificationSettings />);
    await waitFor(() => expect(getSelect().value).toBe('3'));

    fireEvent.change(getSelect(), { target: { value: '' } }); // OFF
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(pushClient.unsubscribeFromPush).toHaveBeenCalled();
    });
    expect(pushClient.subscribeToPush).not.toHaveBeenCalled();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/preferences',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"reminder_weekday":null'),
      }),
    );
  });

  it('does not subscribe when the browser is unsupported', async () => {
    mockPreferencesApi(null);
    pushClient.isPushSupported.mockReturnValue(false);
    render(<NotificationSettings />);
    await waitFor(() => expect(getSelect()).toBeInTheDocument());

    fireEvent.change(getSelect(), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'このブラウザはプッシュ通知に対応していません。',
        'error',
      );
    });
    expect(pushClient.subscribeToPush).not.toHaveBeenCalled();
    // preferences PUT も呼ばれない (enable 失敗で早期 return)
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      '/api/preferences',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
