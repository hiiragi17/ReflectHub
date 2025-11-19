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

interface HeaderProps {
  title: string;
  userName?: string;
  isAuthenticated?: boolean;
  onSignOut?: () => void;
  showBackButton?: boolean;
  backHref?: string;
}

vi.mock('@/components/layout/Header', () => ({
  default: ({ title, userName, showBackButton, backHref }: HeaderProps): ReactNode => (
    <header data-testid="header">
      <h1>{title}</h1>
      {userName && <span>{userName}</span>}
      {showBackButton && <a href={backHref || '#'}>Back</a>}
    </header>
  ),
}));

vi.mock('@/app/dashboard/loading', () => ({
  default: (): ReactNode => <div data-testid="loading">Loading...</div>,
}));

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import SettingsPage from './page';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;

describe('SettingsPage', () => {
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

    render(<SettingsPage />);
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

    render(<SettingsPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth');
    });
  });

  it('should render settings page when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getAllByText('設定').length).toBeGreaterThan(0);
  });

  it('should display correct header title', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    const titles = screen.getAllByText('設定');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should display user name in header', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
  });

  it('should render profile settings section', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
  });

  it('should have link to view profile', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    const viewLink = screen.getByText('プロフィール情報を表示').closest('a');
    expect(viewLink).toHaveAttribute('href', '/profile');
  });

  it('should render reminder settings placeholder', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    expect(screen.getByText('リマインダー設定')).toBeInTheDocument();
    expect(screen.getByText(/リマインダー機能は準備中です/)).toBeInTheDocument();
  });

  it('should render other settings placeholder', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    expect(screen.getByText('その他の設定')).toBeInTheDocument();
    expect(screen.getByText(/今後、追加設定オプションがここに表示されます/)).toBeInTheDocument();
  });

  it('should pass correct header props for back button', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<SettingsPage />);

    const backLink = screen.getByText('Back');
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });
});
