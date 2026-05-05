import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInstallPrompt, type BeforeInstallPromptEvent } from './useInstallPrompt';

type Listener = (event: Event) => void;

interface MockMatchMedia {
  matches: boolean;
  addEventListener: (type: string, cb: Listener) => void;
  removeEventListener: (type: string, cb: Listener) => void;
}

function createMockMatchMedia(initialMatches = false): MockMatchMedia {
  const listeners = new Set<Listener>();
  return {
    matches: initialMatches,
    addEventListener: (_type, cb) => listeners.add(cb),
    removeEventListener: (_type, cb) => listeners.delete(cb),
  };
}

function createBeforeInstallEvent(
  outcome: 'accepted' | 'dismissed' = 'accepted',
): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt');
  Object.defineProperty(event, 'prompt', {
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome, platform: 'web' }),
  });
  Object.defineProperty(event, 'platforms', { value: ['web'] });
  return event as BeforeInstallPromptEvent;
}

describe('useInstallPrompt', () => {
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = window.navigator.userAgent;
  const DISMISS_KEY = 'reflecthub:install-prompt:dismissed-at';

  function setUserAgent(ua: string) {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi
      .fn()
      .mockImplementation(() => createMockMatchMedia(false)) as unknown as typeof window.matchMedia;
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    setUserAgent(originalUserAgent);
    vi.restoreAllMocks();
  });

  it('starts with canInstall=false when no event has fired', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('flips canInstall=true after beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createBeforeInstallEvent());
    });
    expect(result.current.canInstall).toBe(true);
  });

  it('calls prompt() and resolves with user outcome', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const evt = createBeforeInstallEvent('accepted');
    act(() => {
      window.dispatchEvent(evt);
    });

    let outcome: 'accepted' | 'dismissed' | 'unavailable' = 'unavailable';
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(evt.prompt).toHaveBeenCalled();
    expect(outcome).toBe('accepted');
    // 一度使ったプロンプトは破棄される。
    expect(result.current.canInstall).toBe(false);
  });

  it('records dismissal cooldown when user dismisses prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createBeforeInstallEvent('dismissed'));
    });
    await act(async () => {
      await result.current.promptInstall();
    });
    expect(window.localStorage.getItem(DISMISS_KEY)).not.toBeNull();
  });

  it('dismiss() suppresses the prompt and stores cooldown', () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createBeforeInstallEvent());
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.canInstall).toBe(false);
    expect(window.localStorage.getItem(DISMISS_KEY)).not.toBeNull();
  });

  it('respects existing dismissal cooldown on mount', () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createBeforeInstallEvent());
    });
    expect(result.current.canInstall).toBe(false);
  });

  it('keeps deferredPrompt after dismiss so it can re-show once cooldown expires', () => {
    // 14 日 + 1 秒前に dismiss されていた = ちょうど cooldown 切れ。
    const expired = Date.now() - (1000 * 60 * 60 * 24 * 14 + 1000);
    window.localStorage.setItem(DISMISS_KEY, String(expired));

    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createBeforeInstallEvent());
    });
    // cooldown は既に切れているので、deferredPrompt が残ってさえいれば
    // canInstall は true になる。
    expect(result.current.canInstall).toBe(true);
  });

  it('marks installed when appinstalled fires', () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.outcome).toBe('accepted');
  });

  it('returns "unavailable" when promptInstall has no deferred event', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    let outcome: 'accepted' | 'dismissed' | 'unavailable' = 'accepted';
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe('unavailable');
  });

  it('exposes showIOSInstructions=true on iPhone UA', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    );
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.showIOSInstructions).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('exposes showIOSInstructions=true on iPhone Chrome (CriOS) UA', () => {
    // iOS Chrome は中身が WebKit なので beforeinstallprompt が来ない。
    // CriOS でもデバイス側の Share → ホーム画面追加が使えるので案内を出す。
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1',
    );
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.showIOSInstructions).toBe(true);
  });

  it('keeps showIOSInstructions=false on desktop Chrome', () => {
    setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    );
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.showIOSInstructions).toBe(false);
  });

  it('suppresses showIOSInstructions during cooldown', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    );
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.showIOSInstructions).toBe(false);
  });
});
