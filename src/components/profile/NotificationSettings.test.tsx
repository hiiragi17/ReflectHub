import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettings } from './NotificationSettings';

const showToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast }),
}));

const apiFetch = vi.fn();
vi.mock('@/lib/api/apiClient', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const subscribeToPush = vi.fn();
const unsubscribeFromPush = vi.fn();
const requestPushPermission = vi.fn();
const getCurrentSubscription = vi.fn();
vi.mock('@/lib/push/client', () => ({
  isPushSupported: () => true,
  getCurrentSubscription: (...args: unknown[]) => getCurrentSubscription(...args),
  requestPushPermission: (...args: unknown[]) => requestPushPermission(...args),
  subscribeToPush: (...args: unknown[]) => subscribeToPush(...args),
  unsubscribeFromPush: (...args: unknown[]) => unsubscribeFromPush(...args),
}));

const basePrefs = {
  id: 'p1',
  user_id: 'u1',
  pwa_install_dismissed: false,
  timezone: 'Asia/Tokyo',
  notification_preferences: {
    daily_reminder: false,
    weekly_summary: false,
    reminder_time: '20:00',
    achievement_alerts: true,
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function mockGet(prefs = basePrefs) {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ preferences: prefs }),
  });
}

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads preferences from /api/preferences and renders defaults', async () => {
    mockGet();
    render(<NotificationSettings vapidPublicKey="dummy" />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/preferences', { method: 'GET' });
    });

    expect(screen.getByLabelText('通知頻度')).toBeInTheDocument();
    expect(screen.getByLabelText('通知時刻')).toBeInTheDocument();
    expect(screen.getByLabelText('タイムゾーン')).toBeInTheDocument();
  });

  it('shows error message when load fails', async () => {
    apiFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    render(<NotificationSettings vapidPublicKey="dummy" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('通知設定の取得に失敗しました');
    });
  });

  it('disables save button until form is dirty', async () => {
    mockGet();
    render(<NotificationSettings vapidPublicKey="dummy" />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: /保存/ })).toBeDisabled();
  });

  it('subscribes to push and saves when turning notifications ON', async () => {
    mockGet(); // initial GET (frequency=off)

    getCurrentSubscription.mockResolvedValue(null);
    requestPushPermission.mockResolvedValue('granted');
    subscribeToPush.mockResolvedValue({ endpoint: 'https://example/x', p256dh: 'a', auth: 'b' });
    // POST /api/push/subscribe
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // PUT /api/preferences
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ preferences: basePrefs }) });

    const user = userEvent.setup();
    render(<NotificationSettings vapidPublicKey="dummy" />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    await user.click(screen.getByLabelText('通知頻度'));
    await user.click(await screen.findByRole('option', { name: '毎日' }));

    await user.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(subscribeToPush).toHaveBeenCalledWith('dummy');
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/push/subscribe',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/preferences',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(showToast).toHaveBeenCalledWith('通知設定を保存しました。', 'success');
  });

  it('unsubscribes from push when turning notifications OFF', async () => {
    mockGet({
      ...basePrefs,
      notification_preferences: {
        ...basePrefs.notification_preferences,
        daily_reminder: true,
      },
    });

    // PUT /api/preferences
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ preferences: basePrefs }) });
    unsubscribeFromPush.mockResolvedValue('https://example/x');
    // POST /api/push/unsubscribe
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const user = userEvent.setup();
    render(<NotificationSettings vapidPublicKey="dummy" />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    await user.click(screen.getByLabelText('通知頻度'));
    await user.click(await screen.findByRole('option', { name: 'OFF' }));

    await user.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(unsubscribeFromPush).toHaveBeenCalled();
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/push/unsubscribe',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
