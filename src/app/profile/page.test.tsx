import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ProfilePage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock ProfileCard component
// onUpdateProfile は失敗時に reject するため、実物と同様に呼び出し側で捕捉する
vi.mock('@/components/profile/ProfileCard', () => ({
  ProfileCard: ({ user, onUpdateProfile }: { user: { name: string }; onUpdateProfile: (name: string) => Promise<void> }) => (
    <div data-testid="profile-card">
      <div>{user.name}</div>
      <button onClick={() => onUpdateProfile('新しい名前').catch(() => {})}>Update</button>
    </div>
  ),
}));

// Mock NotificationSettings component
vi.mock('@/components/profile/NotificationSettings', () => ({
  NotificationSettings: () => <div data-testid="notification-settings" />,
}));

// Mock Header component
vi.mock('@/components/layout/Header', () => ({
  default: ({ title }: { title: string }) => <div data-testid="header">{title}</div>,
}));

// Mock DashboardLoading component
vi.mock('../dashboard/loading', () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

import { useAuth } from '@/hooks/useAuth';
import { _resetCSRFCacheForTest } from '@/lib/api/apiClient';

/**
 * apiFetch は mutation の前に /api/csrf へトークン取得のリクエストを行うため、
 * URL で分岐して両方の呼び出しに応答を返す fetch モックを組み立てる。
 */
function mockFetchWithCSRF(profileResponse: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((input: RequestInfo | URL) => {
    if (input === '/api/csrf') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ token: 'test-csrf-token' }),
      });
    }
    return Promise.resolve(profileResponse);
  });
}

describe('ProfilePage', () => {
  const mockPush = vi.fn();
  const mockSignOut = vi.fn();

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'テストユーザー',
    provider: 'google' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup router mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });

    // Mock fetch for API calls
    global.fetch = vi.fn();

    // apiClient がモジュールスコープに CSRF トークンをキャッシュするためテスト毎に破棄する
    _resetCSRFCacheForTest();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state when auth is loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      user: null,
      signOut: mockSignOut,
      isLoading: true,
      error: null,
    });

    render(<ProfilePage />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should redirect to auth when not authenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      user: null,
      signOut: mockSignOut,
      isLoading: false,
      error: null,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth?next=/profile');
    });
  });

  it('should render ProfileCard when authenticated', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      isLoading: false,
      error: null,
    });

    render(<ProfilePage />);

    expect(screen.getByTestId('profile-card')).toBeInTheDocument();
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
  });

  it('should render header with correct title', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      isLoading: false,
      error: null,
    });

    render(<ProfilePage />);

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByText('プロフィール')).toBeInTheDocument();
  });

  it('should display error message when there is an error', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      user: null,
      signOut: mockSignOut,
      isLoading: false,
      error: 'Authentication error',
    });

    render(<ProfilePage />);

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByText('Authentication error')).toBeInTheDocument();
  });

  it('should handle profile update successfully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      isLoading: false,
      error: null,
    });

    // Mock successful API response
    mockFetchWithCSRF({
      ok: true,
      status: 200,
      json: async () => ({ profile: { ...mockUser, name: '新しい名前' } }),
    });

    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(<ProfilePage />);

    // Trigger update
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    // 更新成功時はページがリロードされる
    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const patchCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/profile/user-123');
    expect(patchCall).toBeDefined();

    const [, init] = patchCall as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ name: '新しい名前' }));

    const headers = new Headers(init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token');
  });

  it('should display error when profile update fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      isLoading: false,
      error: null,
    });

    // Mock failed API response
    mockFetchWithCSRF({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Update failed' }),
    });

    render(<ProfilePage />);

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByTestId('profile-card')).toBeInTheDocument();
    });

    // Trigger update
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    // 失敗時は API が返したエラーメッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });
});
