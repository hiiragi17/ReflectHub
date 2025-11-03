'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UnsavedChangesDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  fromFrameworkName?: string;
  toFrameworkName?: string;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  fromFrameworkName = 'フレームワーク',
  toFrameworkName = '別のフレームワーク',
}) => {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onCancel();
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ 保存していない変更があります</AlertDialogTitle>
          <AlertDialogDescription>
            {fromFrameworkName} の入力内容を保存せずに {toFrameworkName} に切り替えます。
            よろしいですか？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground py-2">
          <p>📝 入力内容は破棄されます</p>
          <p>💡 先に「保存」をクリックして保存することをお勧めします</p>
        </div>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel onClick={onCancel}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            破棄して切り替え
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};