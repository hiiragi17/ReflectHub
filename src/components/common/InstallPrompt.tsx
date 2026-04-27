'use client';

import { Download, X } from 'lucide-react';
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
 * - `beforeinstallprompt` を受信できる Chromium 系ブラウザでのみ表示される。
 * - ユーザーが「あとで」を押すか dismiss すると 14 日のクールダウンに入る
 *   (`useInstallPrompt` 側で localStorage に記録)。
 * - すでにインストール済み (standalone) なら何も描画しない。
 */
export function InstallPrompt({ disabled = false }: InstallPromptProps) {
  const { canInstall, isPrompting, promptInstall, dismiss } = useInstallPrompt();

  if (disabled) return null;
  if (!canInstall) return null;

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

export default InstallPrompt;
