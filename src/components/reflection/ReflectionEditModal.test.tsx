import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReflectionEditModal } from './ReflectionEditModal';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

const reflection = {
  id: 'r1',
  user_id: 'u1',
  framework_id: 'fw1',
  content: { keep: '続ける', problem: '課題' },
  reflection_date: '2025-11-15',
  created_at: '2025-11-15T10:00:00',
  updated_at: null,
} as unknown as Reflection;

const framework = {
  id: 'fw1',
  name: 'KPT',
  display_name: 'KPT',
  schema: [
    { id: 'keep', label: 'Keep', type: 'textarea', max_length: 10 },
    { id: 'problem', label: 'Problem', type: 'textarea' },
  ],
} as unknown as Framework;

describe('ReflectionEditModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () =>
    render(
      <ReflectionEditModal
        reflection={reflection}
        framework={framework}
        onSave={onSave}
        onClose={onClose}
      />
    );

  const edit = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(new RegExp(label)), {
      target: { value },
    });

  it('変更がないときは、保存を押せない理由を示す', () => {
    setup();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(
      screen.getByText('内容を変更すると「保存」を押せます。')
    ).toBeInTheDocument();
  });

  it('保存に失敗したら、モーダル内に原因と対処を出し、入力を残して再試行できる', async () => {
    onSave.mockRejectedValueOnce(new Error('Failed to fetch'));
    setup();
    edit('Keep', '続ける（修正）');

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('入力内容は画面に残っています');
    expect(alert).toHaveTextContent('もう一度「保存する」を押してください');
    // 入力は残り、保存ボタンは押せるまま
    expect(screen.getByLabelText(/Keep/)).toHaveValue('続ける（修正）');
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled();

    onSave.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith({
      keep: '続ける（修正）',
      problem: '課題',
    });
  });

  it('文字数超過は、該当の項目の下に表示され、保存は呼ばれない', async () => {
    setup();
    edit('Keep', 'あ'.repeat(11));

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(
      await screen.findByText(/赤字で示した項目を直してから/)
    ).toBeInTheDocument();
    expect(screen.getByText(/1文字超えています/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('閉じるボタンに日本語のラベルがある', () => {
    setup();
    expect(
      screen.getByRole('button', { name: '編集を閉じる' })
    ).toBeInTheDocument();
  });

  it('背景は半透明で、後ろの画面が真っ黒に隠れない', () => {
    const { container } = setup();
    const overlay = container.querySelector('.fixed.inset-0.z-40');
    expect(overlay).not.toBeNull();
    // Tailwind v4 では bg-opacity-* が効かず、真っ黒になる。透明度つきの色で指定する
    expect(overlay).toHaveClass('bg-black/50');
    expect(overlay?.className).not.toMatch(/bg-opacity/);
  });
});
