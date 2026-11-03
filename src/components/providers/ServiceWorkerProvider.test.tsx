import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/lib/sw/register', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/pwa/badge', () => ({
  clearAppBadge: vi.fn().mockResolvedValue(undefined),
}));

import { ServiceWorkerProvider } from './ServiceWorkerProvider';
import { registerServiceWorker } from '@/lib/sw/register';
import { clearAppBadge } from '@/lib/pwa/badge';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('ServiceWorkerProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setVisibility('visible');
    vi.clearAllMocks();
  });

  it('Service Worker を登録する', () => {
    render(<ServiceWorkerProvider />);
    expect(registerServiceWorker).toHaveBeenCalledTimes(1);
  });

  it('表示された状態でアプリを開いたとき（マウント時）に、バッジを消す', () => {
    render(<ServiceWorkerProvider />);
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it('背景のタブで読み込まれたとき（マウント時に画面が隠れている）は、バッジを消さない。表示されたら消す', () => {
    setVisibility('hidden');
    vi.mocked(clearAppBadge).mockClear();

    render(<ServiceWorkerProvider />);
    expect(clearAppBadge).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it('画面が再び表示されたときに、バッジを消す', () => {
    render(<ServiceWorkerProvider />);
    vi.mocked(clearAppBadge).mockClear();

    setVisibility('visible');
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it('画面が隠れたときは、バッジを消さない', () => {
    render(<ServiceWorkerProvider />);
    vi.mocked(clearAppBadge).mockClear();

    setVisibility('hidden');
    expect(clearAppBadge).not.toHaveBeenCalled();
  });

  it('アンマウント後は、画面の表示の変化を見ない', () => {
    const { unmount } = render(<ServiceWorkerProvider />);
    unmount();
    vi.mocked(clearAppBadge).mockClear();

    setVisibility('visible');
    expect(clearAppBadge).not.toHaveBeenCalled();
  });
});
