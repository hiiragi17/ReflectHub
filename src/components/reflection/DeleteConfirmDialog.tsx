'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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

interface DeleteConfirmDialogProps {
  reflectionDate: string;
  /** 削除する振り返りの型の名前。同じ日に複数あっても見分けるために表示する */
  frameworkName?: string;
  /** 削除する振り返りの冒頭。どの記録かを内容で見分けるために表示する */
  preview?: string;
  isLoading?: boolean;
  error?: string | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * DeleteConfirmDialog - 振り返りの削除を確認するダイアログ
 *
 * - 日付・型・冒頭を示し、同じ日に複数あっても対象を見分けられる
 * - 取り消せないことを、実行前に伝える
 * - 削除中は閉じられず、二重に実行できない
 * - Escape・フォーカスの移動は、既存の AlertDialog（Radix）に任せる
 */
export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  reflectionDate,
  frameworkName,
  preview,
  isLoading = false,
  error = null,
  onConfirm,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const isDisabled = isDeleting || isLoading;

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        // 削除中は閉じない（結果が分からなくなるため）
        if (!open && !isDisabled) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className="w-5 h-5 text-red-600 shrink-0"
              aria-hidden="true"
            />
            削除確認
          </AlertDialogTitle>
          <AlertDialogDescription>
            以下の振り返りを削除しようとしています。
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 削除する対象（日付・型・冒頭の順に、見分けに使う） */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
          <p className="text-sm font-medium text-gray-900">{reflectionDate}</p>
          {frameworkName && (
            <p className="text-sm text-gray-700">{frameworkName}</p>
          )}
          {preview && (
            <p className="text-sm text-gray-600 break-words">「{preview}」</p>
          )}
        </div>

        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-900">
            この操作は取り消せません。削除した振り返りは元に戻せません。
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-900">{error}</p>
            <p className="mt-1 text-sm text-red-900">
              もう一度「削除する」を押してください。うまくいかない場合は、キャンセルして履歴の一覧に残っているか確認してください。
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>キャンセル</AlertDialogCancel>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isDisabled}
            aria-busy={isDeleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                削除しています…
              </>
            ) : (
              <>
                <Trash2 aria-hidden="true" />
                削除する
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
