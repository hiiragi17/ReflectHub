import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock Supabase first
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
  },
}));

// Mock everything before importing components
vi.mock('@/hooks/useAuth');
vi.mock('next/navigation');

interface ProfileCardProps {
  user: { name: string };
  onSignOut?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isSigningOut?: boolean;
}

vi.mock('@/components/profile/ProfileCard', () => ({
  ProfileCard: ({ user, onSignOut, isSigningOut }: ProfileCardProps): ReactNode => (
    <div data-testid="profile-card">
      <div data-testid="user-name">{user.name}</div>
      {onSignOut && (
        <button onClick={onSignOut} disabled={isSigningOut}>
          {isSigningOut ? 'サインアウト中...' : 'サインアウト'}
        </button>
      )}
    </div>
  ),
}));

interface HeaderProps {
  title: string;
  userName?: string;
  isAuthenticated?: boolean;
  onSignOut?: () => void;
  showBackButton?: boolean;
  backHref?: string;
}

vi.mock('@/components/layout/Header', () => ({
  default: ({ title, userName }: HeaderProps): ReactNode => (
    <header data-testid="header">
      <h1>{title}</h1>
      {userName && <span>{userName}</span>}
    </header>
  ),
}));

vi.mock('@/app/dashboard/loading', () => ({
  default: (): ReactNode => <div data-testid="loading">Loading...</div>,
}));

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ProfilePage from './page';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;

describe('ProfilePage', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'テストユーザー',
    provider: 'google' as const,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-15T15:30:00Z',
  };

  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      signOut: mockSignOut,
    });

    render(<ProfilePage />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should redirect to auth when user is not authenticated', async () => {
    const mockRouter = { push: vi.fn() };
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth');
    });
  });

  it('should render profile page when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfilePage />);

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card')).toBeInTheDocument();
  });

  it('should display user name in header', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfilePage />);

    expect(screen.getAllByText('テストユーザー').length).toBeGreaterThan(0);
  });

  it('should display correct header title', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfilePage />);

    expect(screen.getByText('プロフィール')).toBeInTheDocument();
  });

  it('should pass onSignOut handler to ProfileCard', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfilePage />);

    const signOutButton = screen.getByText('サインアウト');
    expect(signOutButton).toBeInTheDocument();
  });
});
