import { describe, it, expect, vi, afterEach } from 'vitest';
import { clearAppBadge } from './badge';

const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'clearAppBadge');

afterEach(() => {
  // テストで足した clearAppBadge を片付ける
  delete (navigator as unknown as Record<string, unknown>).clearAppBadge;
  if (original) Object.defineProperty(Navigator.prototype, 'clearAppBadge', original);
  vi.restoreAllMocks();
});

function setClearAppBadge(value: unknown) {
  Object.defineProperty(navigator, 'clearAppBadge', { value, configurable: true });
}

describe('clearAppBadge', () => {
  it('対応している環境では、clearAppBadge を呼ぶ', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    setClearAppBadge(fn);
    await clearAppBadge();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('対応していない環境では、何もせず、例外にもならない', async () => {
    await expect(clearAppBadge()).resolves.toBeUndefined();
  });

  it('clearAppBadge が失敗しても、例外にしない', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setClearAppBadge(vi.fn().mockRejectedValue(new Error('denied')));
    await expect(clearAppBadge()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
