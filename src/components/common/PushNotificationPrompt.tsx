'use client';

import { usePushNotification } from '@/hooks/usePushNotification';
import { Bell, BellOff, X } from 'lucide-react';
import { useState } from 'react';

export default function PushNotificationPrompt() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotification();
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('push-prompt-dismissed');
  });

  // サポートされていない or 既に拒否 or 非表示設定
  if (permission === 'unsupported' || permission === 'denied' || isDismissed) {
    return null;
  }

  // 既に購読中の場合は表示しない
  if (isSubscribed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('push-prompt-dismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-amber-200 rounded-xl shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 rounded-lg p-2 shrink-0">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">
            リマインダー通知を受け取る
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            振り返りの時間をお知らせします
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={subscribe}
              disabled={isLoading}
              className="px-4 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? '設定中...' : '通知を許可'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              後で
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 shrink-0"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PushNotificationToggle() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotification();

  if (permission === 'unsupported') {
    return (
      <p className="text-sm text-gray-400">
        このブラウザはプッシュ通知に対応していません
      </p>
    );
  }

  if (permission === 'denied') {
    return (
      <p className="text-sm text-gray-400">
        通知がブロックされています。ブラウザの設定から許可してください
      </p>
    );
  }

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
        isSubscribed
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {isSubscribed ? (
        <>
          <BellOff className="w-4 h-4" />
          通知を解除
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          {isLoading ? '設定中...' : '通知を有効にする'}
        </>
      )}
    </button>
  );
}
