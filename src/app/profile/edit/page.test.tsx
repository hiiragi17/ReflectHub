import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Supabase first
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
  },
}));

// Mock everything before importing components
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useToast');
vi.mock('next/navigation');

vi.mock('@/components/layout/Header', () => ({
  default: ({ title, userName }: any) => (
    <header data-testid="header">
      <h1>{title}</h1>
      {userName && <span>{userName}</span>}
    </header>
  ),
}));

vi.mock('@/app/dashboard/loading', () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import ProfileEditPage from './page';

const mockUseAuth = useAuth as any;
const mockUseToast = useToast as any;
const mockUseRouter = useRouter as any;

describe('ProfileEditPage', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'テストユーザー',
    provider: 'google' as const,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-15T15:30:00Z',
  };

  const mockSignOut = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
  });

  it('should render loading state when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);
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

    render(<ProfileEditPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth');
    });
  });

  it('should render edit form when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    expect(screen.getByText('プロフィール情報を編集')).toBeInTheDocument();
    expect(screen.getByLabelText('名前')).toBeInTheDocument();
  });

  it('should populate name field with current user name', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    const nameInput = screen.getByDisplayValue('テストユーザー');
    expect(nameInput).toBeInTheDocument();
  });

  it('should show character count', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    expect(screen.getByText(/文字/)).toBeInTheDocument();
  });

  it('should update character count when name changes', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    const nameInput = screen.getByLabelText('名前') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '新しい名前' } });

    await waitFor(() => {
      expect(screen.getByText(/7\/100文字/)).toBeInTheDocument();
    });
  });

  it('should show validation error when name is empty', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    const nameInput = screen.getByLabelText('名前') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '' } });

    const saveButton = screen.getByText('変更を保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('名前を入力してください')).toBeInTheDocument();
    });
  });

  it('should show validation error when name exceeds max length', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    const nameInput = screen.getByLabelText('名前') as HTMLInputElement;
    const longName = 'a'.repeat(101);
    fireEvent.change(nameInput, { target: { value: longName } });

    const saveButton = screen.getByText('変更を保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('名前は100文字以内で入力してください')).toBeInTheDocument();
    });
  });

  it('should have cancel button that redirects to profile', () => {
    const mockRouter = { push: vi.fn() };
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/profile');
  });

  it('should render sign out section', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    expect(screen.getByText('その他の操作')).toBeInTheDocument();
    expect(screen.getByText(/サインアウト/)).toBeInTheDocument();
  });

  it('should disable save button when name has not changed', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<ProfileEditPage />);

    const saveButton = screen.getByText('変更を保存');
    expect(saveButton).toBeDisabled();
  });
});
