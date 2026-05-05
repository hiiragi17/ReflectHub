'use client';

import { Download, Plus, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export interface InstallPromptProps {
  /**
   * 表示を抑制したいページ (たとえば認証ページ) で使う。
   * 既定は false。
   */
  disabled?: boolean;
}

/**
 * PWA インストール促し UI。
 *
 * - Chromium 系: `beforeinstallprompt` を受信したらネイティブ UI を起動。
 * - iOS Safari など `beforeinstallprompt` が来ない環境: 「共有 → ホーム画面に
 *   追加」の手順案内を出す (iOS では JS からインストールを起動できないため)。
 * - dismiss すると 14 日のクールダウンに入る (どちらの UI も共通)。
 * - すでにインストール済み (standalone) なら何も描画しない。
 */
export function InstallPrompt({ disabled = false }: InstallPromptProps) {
  const {
    canInstall,
    showIOSInstructions,
    isPrompting,
    promptInstall,
    dismiss,
  } = useInstallPrompt();

  if (disabled) return null;

  if (canInstall) {
    return (
      <div
        role="dialog"
        aria-labelledby="install-prompt-title"
        aria-describedby="install-prompt-description"
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border bg-card text-card-foreground shadow-lg sm:left-auto sm:right-4 sm:mx-0"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Download className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 id="install-prompt-title" className="text-sm font-semibold">
              ReflectHub をインストール
            </h2>
            <p
              id="install-prompt-description"
              className="text-sm text-muted-foreground"
            >
              ホーム画面に追加してアプリのように起動できます。オフラインでも閲覧可能です。
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void promptInstall();
                }}
                disabled={isPrompting}
              >
                {isPrompting ? 'インストール中…' : 'インストール'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
                あとで
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  if (showIOSInstructions) {
    return (
      <div
        role="dialog"
        aria-labelledby="install-prompt-ios-title"
        aria-describedby="install-prompt-ios-description"
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border bg-card text-card-foreground shadow-lg sm:left-auto sm:right-4 sm:mx-0"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Download className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 id="install-prompt-ios-title" className="text-sm font-semibold">
              ReflectHub をホーム画面に追加
            </h2>
            <p
              id="install-prompt-ios-description"
              className="text-sm text-muted-foreground"
            >
              アプリのように起動できます。下記の手順で追加してください。
            </p>
            <ol className="space-y-1 pt-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span>1.</span>
                <Share
                  className="h-4 w-4 text-foreground"
                  aria-hidden="true"
                />
                <span>画面下の「共有」ボタンをタップ</span>
              </li>
              <li className="flex items-center gap-2">
                <span>2.</span>
                <Plus
                  className="h-4 w-4 text-foreground"
                  aria-hidden="true"
                />
                <span>「ホーム画面に追加」を選択</span>
              </li>
            </ol>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default InstallPrompt;
