import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();
  const reflectionDate = '2025年11月15日（土）';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dialog with warning message', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('削除確認')).toBeInTheDocument();
    expect(screen.getByText(reflectionDate)).toBeInTheDocument();
    expect(
      screen.getByText(/この操作は取り消せません/)
    ).toBeInTheDocument();
  });

  it('should have cancel and delete buttons', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('キャンセル')).toBeInTheDocument();
    expect(screen.getByText('削除')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when delete button is clicked', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('should display error message when provided', () => {
    const errorMessage = 'この振り返りデータの削除権限がありません。';

    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        error={errorMessage}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should close modal when clicking overlay', () => {
    const { container } = render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const overlay = container.querySelector('.fixed.inset-0.bg-black');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('should disable buttons when loading', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        isLoading={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const deleteButton = screen.getByText('削除');
    const cancelButton = screen.getByText('キャンセル');

    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should show loading text when deleting', async () => {
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('削除中...')).toBeInTheDocument();
    });
  });
});
