'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Chrome / Edge が発火する beforeinstallprompt の型定義。
 * `BeforeInstallPromptEvent` は標準 lib に含まれていないので最小限を宣言。
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'reflecthub:install-prompt:dismissed-at';
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14; // 14 日

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari の独自フラグ。
  const navAny = window.navigator as Navigator & { standalone?: boolean };
  return navAny.standalone === true;
}

function readDismissedAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

export interface UseInstallPromptResult {
  /** インストール候補プロンプトを表示できるか。UI を出すかの判断に使う。 */
  canInstall: boolean;
  /** すでに standalone (インストール済み) として動いているか。 */
  isInstalled: boolean;
  /** インストール処理中フラグ。 */
  isPrompting: boolean;
  /** 直近のユーザー選択。dismissed/accepted/null。 */
  outcome: 'accepted' | 'dismissed' | null;
  /** インストールプロンプトを表示する。 */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** UI を閉じる。クールダウンを記録する。 */
  dismiss: () => void;
}

/**
 * `beforeinstallprompt` イベントを保持しつつ、インストール状態とユーザー
 * アクションを React 側から扱えるようにするフック。
 */
export function useInstallPrompt(): UseInstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [isPrompting, setIsPrompting] = useState(false);
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(() =>
    readDismissedAt(),
  );

  // dismissedAt が更新されるたびに残り時間ぶんの setTimeout を貼り直す。
  // `cooldownActive` を派生値にすることで、別タブから DISMISS_KEY が更新されて
  // タイムスタンプだけ変わった場合 (true → true) でも timer を再スケジュール
  // できる。タブを長期間開きっぱなしでも 14 日経過後は再表示できる。
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const recompute = (e?: StorageEvent) => {
      // 関係ないキーの storage 更新は無視する。
      if (e && e.key !== null && e.key !== DISMISS_KEY) return;
      setDismissedAt(readDismissedAt());
    };

    let timer: number | undefined;
    if (dismissedAt !== null) {
      const remaining = DISMISS_COOLDOWN_MS - (Date.now() - dismissedAt);
      if (remaining <= 0) {
        // 既に期限切れ → 状態を null に落として cooldownActive を false にする。
        setDismissedAt(null);
      } else {
        timer = window.setTimeout(() => setDismissedAt(null), remaining);
      }
    }

    window.addEventListener('storage', recompute);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('storage', recompute);
    };
  }, [dismissedAt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstall = (e: Event) => {
      // ブラウザが自動表示しないようにし、自前 UI から prompt() する。
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setOutcome('accepted');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // display-mode の変更 (PWA で起動など) を検知。
    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onModeChange = () => setInstalled(isStandalone());
    mql?.addEventListener?.('change', onModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      mql?.removeEventListener?.('change', onModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable' as const;
    setIsPrompting(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setOutcome(choice.outcome);
      // prompt は一度しか使えないので破棄。
      setDeferredPrompt(null);
      if (choice.outcome === 'dismissed') {
        const now = Date.now();
        try {
          window.localStorage.setItem(DISMISS_KEY, String(now));
        } catch {
          // localStorage が無効でも致命的ではないので無視。
        }
        setDismissedAt(now);
      }
      return choice.outcome;
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setOutcome('dismissed');
    // `deferredPrompt` は破棄しない。実際に `prompt()` を呼んでいない以上、
    // ブラウザから受け取った event はまだ有効で、14 日のクールダウンが
    // 切れたあとに再表示すれば再利用できる。
    const now = Date.now();
    try {
      window.localStorage.setItem(DISMISS_KEY, String(now));
    } catch {
      // ignore
    }
    setDismissedAt(now);
  }, []);

  // dismissedAt から派生。タブが長く開いていても render ごとに再評価される。
  const cooldownActive =
    dismissedAt !== null && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;

  const canInstall =
    !installed && !cooldownActive && deferredPrompt !== null && !isPrompting;

  return {
    canInstall,
    isInstalled: installed,
    isPrompting,
    outcome,
    promptInstall,
    dismiss,
  };
}
