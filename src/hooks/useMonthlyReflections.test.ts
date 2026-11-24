import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { getUserReflections, getFrameworks } = vi.hoisted(() => ({
  getUserReflections: vi.fn(),
  getFrameworks: vi.fn(async () => []),
}));

vi.mock('@/services/reflectionService', () => ({ getUserReflections }));
vi.mock('@/services/frameworkService', () => ({ frameworkService: { getFrameworks } }));
vi.mock('@/services/calendarService', () => ({
  getMonthCalendarData: (year: number, month: number) => ({ year, month }),
}));
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'user-1' } }) }));

import { useMonthlyReflections } from './useMonthlyReflections';

describe('useMonthlyReflections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('前に取得し終えた月に戻ったときも、取り直している間は読み込み中にする', async () => {
    getUserReflections.mockResolvedValue([]);
    const { result, rerender } = renderHook(({ month }) => useMonthlyReflections({ year: 2026, month }), {
      initialProps: { month: 10 },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 11 月の取得は終わらせない
    getUserReflections.mockImplementation(() => new Promise(() => {}));
    rerender({ month: 11 });
    expect(result.current.isLoading).toBe(true);

    // 10 月に戻る: 新しい取得が走っている間は読み込み中
    rerender({ month: 10 });
    expect(result.current.isLoading).toBe(true);
  });

  it('前回のエラーを、取り直している間は返さない', async () => {
    getUserReflections.mockRejectedValue(new Error('失敗'));
    const { result, rerender } = renderHook(({ month }) => useMonthlyReflections({ year: 2026, month }), {
      initialProps: { month: 10 },
    });
    await waitFor(() => expect(result.current.error).toBe('失敗'));

    getUserReflections.mockImplementation(() => new Promise(() => {}));
    rerender({ month: 11 });
    rerender({ month: 10 });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
