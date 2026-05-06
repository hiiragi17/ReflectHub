'use client';

import { Check, Download, Plus, Share, X } from 'lucide-react';
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
            <ol className="space-y-1.5 pt-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="shrink-0">1.</span>
                <Share
                  className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <span>アドレスバーまたはツールバーの「共有」ボタンをタップ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0">2.</span>
                <Plus
                  className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <span>メニューを下にスクロールし「ホーム画面に追加」を選択</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0">3.</span>
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <span>右上の「追加」をタップして完了</span>
              </li>
            </ol>
            <p className="pt-2 text-xs text-muted-foreground">
              ※ うまくいかない場合は Safari で開いてからお試しください。
            </p>
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
