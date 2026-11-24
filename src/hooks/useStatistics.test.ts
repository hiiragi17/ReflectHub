import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const summary = { total: 1 };
const trends = { monthly: [] };
const distribution = { frameworks: [] };

const okResponse = (url: string) => {
  if (url.endsWith('/summary')) return { summary };
  if (url.endsWith('/trends')) return { trends };
  return { distribution };
};

// テストごとにモジュールのキャッシュを空にするため、毎回読み込み直す
const loadHook = async () => (await import('./useStatistics')).useStatistics;

describe('useStatistics', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn(async (url: string) =>
      new Response(JSON.stringify(okResponse(url)), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('取得した結果を返し、読み込みを終える', async () => {
    const useStatistics = await loadHook();
    const { result } = renderHook(() => useStatistics('user-1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.summary).toEqual(summary);
    expect(result.current.error).toBeNull();
  });

  it('キャッシュを使った項目の時刻は更新せず、60 秒経てば取り直す', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const useStatistics = await loadHook();

    const first = renderHook(() => useStatistics('user-1'));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    first.unmount();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // 50 秒後: キャッシュが新しいので取り直さない
    vi.setSystemTime(Date.now() + 50_000);
    const second = renderHook(() => useStatistics('user-1'));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    second.unmount();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // さらに 20 秒後(最初の取得から 70 秒): 時刻が更新されていなければ取り直す
    vi.setSystemTime(Date.now() + 20_000);
    const third = renderHook(() => useStatistics('user-1'));
    await waitFor(() => expect(third.result.current.isLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('ユーザー切り替え後に古い refetch が失敗しても、新しいユーザーのエラーを消さない', async () => {
    const useStatistics = await loadHook();
    const { result, rerender } = renderHook(({ id }) => useStatistics(id), {
      initialProps: { id: 'user-1' },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // user-1 の refetch は保留にしておき、あとで失敗させる
    let rejectRefetch: (err: Error) => void = () => {};
    fetchMock.mockImplementation(
      () => new Promise((_, reject) => { rejectRefetch = reject; }),
    );
    let refetchPromise: Promise<void> = Promise.resolve();
    act(() => {
      refetchPromise = result.current.refetch();
    });

    // user-2 に切り替え、その初回取得は失敗する
    fetchMock.mockImplementation(async () => new Response('{}', { status: 500 }));
    rerender({ id: 'user-2' });
    await waitFor(() => expect(result.current.error).toBe('リクエストに失敗しました (500)'));

    // 古い refetch が失敗しても、user-2 のエラーは残る
    await act(async () => {
      rejectRefetch(new Error('古いユーザーの失敗'));
      await refetchPromise;
    });
    expect(result.current.error).toBe('リクエストに失敗しました (500)');
  });

  it('古い refetch が失敗したあとに新しいユーザーの refetch が失敗しても、そのエラーを返す', async () => {
    const useStatistics = await loadHook();
    const { result, rerender } = renderHook(({ id }) => useStatistics(id), {
      initialProps: { id: 'user-1' },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 1. user-1 の refetch を保留にしたまま、user-2 に切り替える(user-2 の初回取得は成功)
    let rejectOld: (err: Error) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((_, reject) => { rejectOld = reject; }));
    let oldRefetch: Promise<void> = Promise.resolve();
    act(() => {
      oldRefetch = result.current.refetch();
    });
    fetchMock.mockImplementation(async (url: string) =>
      new Response(JSON.stringify(okResponse(url)), { status: 200 }),
    );
    rerender({ id: 'user-2' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 2. user-2 の refetch を保留で開始する
    let rejectNew: (err: Error) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((_, reject) => { rejectNew = reject; }));
    let newRefetch: Promise<void> = Promise.resolve();
    act(() => {
      newRefetch = result.current.refetch();
    });

    // 3. 古い user-1 の refetch が失敗する
    await act(async () => {
      rejectOld(new Error('user-1 の失敗'));
      await oldRefetch;
    });

    // 4. user-2 の refetch が失敗する: user-2 のエラーが返る
    await act(async () => {
      rejectNew(new Error('user-2 の失敗'));
      await newRefetch;
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('user-2 の失敗');
  });
});
