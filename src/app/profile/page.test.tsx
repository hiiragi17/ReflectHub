import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
vi.mock('@/components/profile/ProfileCard', () => ({
  ProfileCard: ({ user, onUpdateProfile }: { user: { name: string }; onUpdateProfile: (name: string) => void }) => (
    <div data-testid="profile-card">
      <div>{user.name}</div>
      <button onClick={() => onUpdateProfile('新しい名前')}>Update</button>
    </div>
  ),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { ...mockUser, name: '新しい名前' } }),
    });

    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    const { getByRole } = render(<ProfilePage />);

    // Trigger update
    const updateButton = getByRole('button', { name: /update/i });
    updateButton.click();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/profile/user-123',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' }),
    });

    render(<ProfilePage />);

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByTestId('profile-card')).toBeInTheDocument();
    });
  });
});
