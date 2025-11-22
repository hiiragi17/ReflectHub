import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import type { User } from '@/types/auth';

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'テストユーザー',
  provider: 'google',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ProfileCard', () => {
  it('should render user name', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
  });

  it('should render profile title and description', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    expect(screen.getByText('プロフィール情報')).toBeInTheDocument();
    expect(screen.getByText('アカウント情報を確認・編集できます')).toBeInTheDocument();
  });

  it('should show edit button in view mode', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    const editButton = screen.getByRole('button', { name: /編集/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should switch to edit mode when edit button is clicked', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    const editButton = screen.getByRole('button', { name: /編集/i });
    fireEvent.click(editButton);

    // Should show input field
    const nameInput = screen.getByPlaceholderText('名前を入力');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue('テストユーザー');

    // Should show save and cancel buttons
    expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();

    // Should hide edit button
    expect(screen.queryByRole('button', { name: /編集/i })).not.toBeInTheDocument();
  });

  it('should allow editing name in edit mode', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /編集/i });
    fireEvent.click(editButton);

    // Change name
    const nameInput = screen.getByPlaceholderText('名前を入力') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '新しい名前' } });

    expect(nameInput.value).toBe('新しい名前');
  });

  it('should call onUpdateProfile when save is clicked', async () => {
    const mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }));

    // Change name
    const nameInput = screen.getByPlaceholderText('名前を入力');
    fireEvent.change(nameInput, { target: { value: '新しい名前' } });

    // Save
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('新しい名前');
    });
  });

  it('should cancel editing when cancel button is clicked', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }));

    // Change name
    const nameInput = screen.getByPlaceholderText('名前を入力');
    fireEvent.change(nameInput, { target: { value: '新しい名前' } });

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    fireEvent.click(cancelButton);

    // Should return to view mode with original name
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('名前を入力')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument();
  });

  it('should disable save button when name is whitespace only', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }));

    // Set name to whitespace
    const nameInput = screen.getByPlaceholderText('名前を入力');
    fireEvent.change(nameInput, { target: { value: '   ' } });

    // Save button should be disabled
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should show error when update fails', async () => {
    const mockOnUpdate = vi.fn().mockRejectedValue(new Error('更新失敗'));
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }));

    // Change name
    const nameInput = screen.getByPlaceholderText('名前を入力');
    fireEvent.change(nameInput, { target: { value: '新しい名前' } });

    // Save
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('更新失敗')).toBeInTheDocument();
    });
  });

  it('should exit edit mode after successful save', async () => {
    const mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }));

    // Verify we're in edit mode
    expect(screen.getByPlaceholderText('名前を入力')).toBeInTheDocument();

    // Change name
    const nameInput = screen.getByPlaceholderText('名前を入力');
    fireEvent.change(nameInput, { target: { value: '新しい名前' } });

    // Save
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    // Should exit edit mode after save
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('名前を入力')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument();
    });
  });

  it('should disable edit button when isUpdating prop is true', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} isUpdating={true} />);

    const editButton = screen.getByRole('button', { name: /編集/i });
    expect(editButton).toBeDisabled();
  });

  it('should disable save button when name is empty', () => {
    const mockOnUpdate = vi.fn();
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }));

    // Clear name
    const nameInput = screen.getByPlaceholderText('名前を入力');
    fireEvent.change(nameInput, { target: { value: '' } });

    // Save button should be disabled
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  it('should trim whitespace when saving', async () => {
    const mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    render(<ProfileCard user={mockUser} onUpdateProfile={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }));

    // Change name with whitespace
    const nameInput = screen.getByPlaceholderText('名前を入力');
    fireEvent.change(nameInput, { target: { value: '  新しい名前  ' } });

    // Save
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('新しい名前');
    });
  });
});
