'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { useCSRFToken } from '@/hooks/useCSRFToken';
import {
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  type SerializedPushSubscription,
} from '@/lib/push/client';

const DISMISS_KEY = 'reflecthub:push-prompt-dismissed';

interface PushNotificationPromptProps {
  vapidPublicKey?: string;
  onSubscribed?: (subscription: SerializedPushSubscription) => void;
}

/**
 * Push 通知の許可をユーザーに求めるプロンプト UI。
 *
 * - ブラウザ非対応 / すでに許可済み / 拒否済み / 過去に閉じた場合は表示しない
 * - 同意したら subscribe して /api/push/subscribe に POST する
 */
export function PushNotificationPrompt({
  vapidPublicKey,
  onSubscribed,
}: PushNotificationPromptProps) {
  const { showToast } = useToast();
  const { withCSRFHeader } = useCSRFToken();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') return;
    if (getPushPermission() === 'default') {
      setVisible(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
    setVisible(false);
  }, []);

  const handleEnable = useCallback(async () => {
    if (!vapidPublicKey) {
      showToast('プッシュ通知の設定が完了していません。', 'error');
      return;
    }
    setBusy(true);
    try {
      const permission = await requestPushPermission();
      if (permission !== 'granted') {
        showToast('通知の許可が得られませんでした。', 'warning');
        setVisible(false);
        return;
      }
      const subscription = await subscribeToPush(vapidPublicKey);
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: withCSRFHeader({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(subscription),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'プッシュ通知の登録に失敗しました。');
      }
      showToast('プッシュ通知を有効にしました。', 'success');
      onSubscribed?.(subscription);
      setVisible(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'プッシュ通知の登録に失敗しました。';
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  }, [vapidPublicKey, withCSRFHeader, showToast, onSubscribed]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="push-prompt-title"
      className="fixed bottom-4 left-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border bg-background p-4 shadow-lg"
    >
      <h2 id="push-prompt-title" className="text-sm font-semibold">
        プッシュ通知を有効にしますか？
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        毎日の振り返り時間にやさしくお知らせします。設定はいつでも変更できます。
      </p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={busy}>
          後で
        </Button>
        <Button size="sm" onClick={handleEnable} disabled={busy}>
          {busy ? '設定中...' : '有効にする'}
        </Button>
      </div>
    </div>
  );
}
