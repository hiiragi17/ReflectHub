import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistoryPage from './page';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/reflectionService', () => ({
  reflectionService: { getByUser: vi.fn() },
}));

vi.mock('@/components/layout/Header', () => ({
  default: () => <header data-testid="header" />,
}));

vi.mock('@/app/dashboard/loading', () => ({
  default: () => <div>loading</div>,
}));

vi.mock('@/components/reflection/Calendar', () => ({
  Calendar: ({
    reflections,
    onDateClick,
  }: {
    reflections: unknown[];
    onDateClick: (date: Date, reflections: unknown[]) => void;
  }) => (
    <button onClick={() => onDateClick(new Date(2025, 10, 15), reflections)}>
      15日を選ぶ
    </button>
  ),
}));

const frameworkRows = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => frameworkRows() }),
      }),
    }),
  },
}));

import { useAuth } from '@/hooks/useAuth';
import { reflectionService } from '@/services/reflectionService';

const reflection = (id: string, date: string) => ({
  id,
  user_id: 'u1',
  framework_id: 'fw1',
  content: { keep: '続ける' },
  reflection_date: date,
  created_at: `${date}T10:00:00`,
  updated_at: null,
});

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'u1', name: 'テスト' },
      signOut: vi.fn(),
      isLoading: false,
    });
    frameworkRows.mockResolvedValue({
      data: [
        {
          id: 'fw1',
          name: 'kpt',
          display_name: 'KPT',
          schema: { fields: [{ id: 'keep', label: 'Keep' }] },
        },
      ],
      error: null,
    });
  });

  it('記録がないときは、空の状態と最初の振り返りへの案内を出す', async () => {
    (reflectionService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(<HistoryPage />);

    expect(await screen.findByText('まだ振り返りがありません')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('取得に失敗したときは「記録がない」と区別し、再読み込みで回復できる', async () => {
    const getByUser = reflectionService.getByUser as ReturnType<typeof vi.fn>;
    getByUser.mockRejectedValueOnce(new Error('network'));
    render(<HistoryPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('履歴を読み込めませんでした');
    // 記録がないと誤解させる表示や、0件の統計は出さない
    expect(screen.queryByText('まだ振り返りがありません')).not.toBeInTheDocument();
    expect(screen.queryByText('総振り返り数')).not.toBeInTheDocument();

    getByUser.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'もう一度読み込む' }));

    expect(await screen.findByText('まだ振り返りがありません')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('型の取得に失敗したときも、失敗として案内する', async () => {
    (reflectionService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      reflection('r1', '2025-11-15'),
    ]);
    frameworkRows.mockResolvedValue({ data: null, error: { message: 'x' } });
    render(<HistoryPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('履歴を読み込めませんでした');
  });

  it('「継続日数」ではなく、実態どおり「記録した日数」と表示する', async () => {
    (reflectionService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      reflection('r1', '2025-11-15'),
      reflection('r2', '2025-11-15'),
      reflection('r3', '2025-11-20'),
    ]);
    render(<HistoryPage />);

    expect(await screen.findByText('記録した日数')).toBeInTheDocument();
    expect(screen.queryByText('継続日数')).not.toBeInTheDocument();
    expect(screen.getByLabelText('記録した日数').textContent).toBe('2');
  });

  it('日付を選ぶと、詳細の見出しにフォーカスが移る', async () => {
    (reflectionService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      reflection('r1', '2025-11-15'),
    ]);
    render(<HistoryPage />);

    fireEvent.click(await screen.findByRole('button', { name: '15日を選ぶ' }));

    const heading = await screen.findByRole('heading', {
      name: '2025年11月15日（土）',
    });
    await waitFor(() => expect(heading).toHaveFocus());
  });
});
