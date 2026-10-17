'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SecuritySettingsProps {
  /** 全端末からログアウトする。成功したら true (この端末も含めてログアウト済み) */
  onSignOutAllDevices: () => Promise<boolean>;
}

/**
 * プロフィールページ最下部の「他の端末からもログアウト」。
 *
 * 端末の紛失や共用端末へのログイン忘れに備えた操作。普段使う機能ではなく、
 * 不要な心配を与えないよう、カードではなく控えめなテキストリンクで置く。
 * 確認ダイアログを挟み、実行中は閉じられず二重に実行できない。失敗したときは
 * この端末のログイン状態が維持されるので、ダイアログ内で再試行を案内する。
 */
export function SecuritySettings({ onSignOutAllDevices }: SecuritySettingsProps) {
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleConfirm = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setFailed(false);
    try {
      const ok = await onSignOutAllDevices();
      if (!ok) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="text-center">
      <Button
        type="button"
        variant="link"
        size="sm"
        className="text-gray-500 hover:text-gray-700"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        他の端末からもログアウト
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          // 実行中は閉じない（結果が分からなくなるため）
          if (!next && isRunning) return;
          setOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>他の端末からもログアウトしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この端末を含む、ログイン中のすべての端末（ブラウザ・ホーム画面に追加したアプリ）からログアウトします。
              もう一度使うには、それぞれの端末で再ログインが必要です。
            </AlertDialogDescription>
          </AlertDialogHeader>

          {failed && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-900">
                ログアウトに失敗しました。通信状況を確認して、もう一度お試しください。
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRunning}>キャンセル</AlertDialogCancel>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isRunning}
              aria-busy={isRunning}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  ログアウトしています…
                </>
              ) : (
                'すべての端末からログアウト'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
