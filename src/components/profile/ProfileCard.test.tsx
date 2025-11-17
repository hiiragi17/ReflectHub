import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';

describe('ProfileCard', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'テストユーザー',
    provider: 'google' as const,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-15T15:30:00Z',
  };

  const mockOnSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user name', () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
  });

  it('should display registration and update dates', () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText(/登録日時/)).toBeInTheDocument();
    expect(screen.getByText(/最終更新/)).toBeInTheDocument();
  });

  it('should format dates', () => {
    render(<ProfileCard user={mockUser} />);
    // Check that dates are displayed (format may vary by environment)
    const dateTexts = screen.getAllByText(/2025/);
    expect(dateTexts.length).toBeGreaterThan(0);
  });

  it('should render edit profile link', () => {
    render(<ProfileCard user={mockUser} />);
    const editButton = screen.getByText('プロフィールを編集');
    expect(editButton).toBeInTheDocument();
    expect(editButton.closest('a')).toHaveAttribute('href', '/profile/edit');
  });

  it('should render sign out button when onSignOut is provided', () => {
    render(<ProfileCard user={mockUser} onSignOut={mockOnSignOut} />);
    const signOutButton = screen.getByText('サインアウト');
    expect(signOutButton).toBeInTheDocument();
  });

  it('should not render sign out button when onSignOut is not provided', () => {
    render(<ProfileCard user={mockUser} />);
    const signOutButton = screen.queryByText('サインアウト');
    expect(signOutButton).not.toBeInTheDocument();
  });

  it('should call onSignOut when sign out button is clicked', async () => {
    mockOnSignOut.mockResolvedValue(undefined);
    render(<ProfileCard user={mockUser} onSignOut={mockOnSignOut} />);

    const signOutButton = screen.getByText('サインアウト');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockOnSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('should show signing out state', async () => {
    mockOnSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<ProfileCard user={mockUser} onSignOut={mockOnSignOut} isSigningOut={true} />);

    expect(screen.getByText('サインアウト中...')).toBeInTheDocument();
  });

  it('should disable sign out button when signing out', () => {
    render(
      <ProfileCard
        user={mockUser}
        onSignOut={mockOnSignOut}
        isSigningOut={true}
      />
    );

    const signOutButton = screen.getByText('サインアウト中...');
    expect(signOutButton).toBeDisabled();
  });

  it('should render card with correct styling', () => {
    const { container } = render(<ProfileCard user={mockUser} />);
    const card = container.querySelector('[class*="shadow-sm"]');
    expect(card).toBeInTheDocument();
  });

  it('should handle different user names', () => {
    const userWithDifferentName = {
      ...mockUser,
      name: '山田太郎',
    };

    render(<ProfileCard user={userWithDifferentName} />);
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
  });
});
