import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecuritySettings } from './SecuritySettings';

const openDialog = () =>
  fireEvent.click(screen.getByRole('button', { name: 'すべての端末からログアウト' }));

// ダイアログ内の確定ボタン (トリガーと同じ名前なので、ダイアログ内から探す)
const confirmButton = () =>
  screen
    .getAllByRole('button', { name: 'すべての端末からログアウト' })
    .find((el) => el.closest('[role="alertdialog"]'))!;

describe('SecuritySettings', () => {
  it('押しただけでは実行せず、確認ダイアログを出す', () => {
    const onSignOutAllDevices = vi.fn().mockResolvedValue(true);
    render(<SecuritySettings onSignOutAllDevices={onSignOutAllDevices} />);

    openDialog();

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onSignOutAllDevices).not.toHaveBeenCalled();
  });

  it('キャンセルすると実行しない', () => {
    const onSignOutAllDevices = vi.fn().mockResolvedValue(true);
    render(<SecuritySettings onSignOutAllDevices={onSignOutAllDevices} />);

    openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onSignOutAllDevices).not.toHaveBeenCalled();
  });

  it('確定すると実行する', async () => {
    const onSignOutAllDevices = vi.fn().mockResolvedValue(true);
    render(<SecuritySettings onSignOutAllDevices={onSignOutAllDevices} />);

    openDialog();
    fireEvent.click(confirmButton());

    await waitFor(() => expect(onSignOutAllDevices).toHaveBeenCalledTimes(1));
  });

  it('失敗したらダイアログ内にエラーを出し、再試行できる', async () => {
    const onSignOutAllDevices = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<SecuritySettings onSignOutAllDevices={onSignOutAllDevices} />);

    openDialog();
    fireEvent.click(confirmButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('ログアウトに失敗しました');

    fireEvent.click(confirmButton());
    await waitFor(() => expect(onSignOutAllDevices).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('例外が出た場合も失敗として扱う', async () => {
    const onSignOutAllDevices = vi.fn().mockRejectedValue(new Error('network'));
    render(<SecuritySettings onSignOutAllDevices={onSignOutAllDevices} />);

    openDialog();
    fireEvent.click(confirmButton());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
