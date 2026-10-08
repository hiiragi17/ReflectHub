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
    expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument();
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

    const deleteButton = screen.getByRole('button', { name: '削除する' });
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

  it('背景をクリックしても閉じない（削除は誤って閉じさせない）', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const overlay = document.querySelector<HTMLElement>(
      '[data-slot="alert-dialog-overlay"]'
    );
    expect(overlay).toBeInTheDocument();
    fireEvent.pointerDown(overlay!);
    fireEvent.click(overlay!);

    expect(mockOnCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
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

    const deleteButton = screen.getByRole('button', { name: /削除する/ });
    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });

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

    const deleteButton = screen.getByRole('button', { name: '削除する' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('削除しています…')).toBeInTheDocument();
    });
  });

  it('型の名前と内容の冒頭を示し、同じ日の別の振り返りと見分けられる', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        frameworkName="KPT"
        preview="毎朝の散歩を続けられた"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('KPT')).toBeInTheDocument();
    expect(screen.getByText(/毎朝の散歩を続けられた/)).toBeInTheDocument();
  });

  it('Escape で閉じられる', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('削除中は Escape でも閉じず、連打しても1回しか実行しない', async () => {
    mockOnConfirm.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const button = screen.getByRole('button', { name: '削除する' });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    await waitFor(() => expect(mockOnConfirm).toHaveBeenCalledTimes(1));
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('失敗したときは、原因に加えて次の行動を示す', () => {
    render(
      <DeleteConfirmDialog
        reflectionDate={reflectionDate}
        error="通信に失敗しました"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('通信に失敗しました');
    expect(alert).toHaveTextContent('もう一度「削除する」を押してください');
  });
});
