'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/api/apiClient';
import {
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/client';
import { isIOSDevice } from '@/lib/pwa/standalone';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import type { NotificationPreferences } from '@/types/push';

/** OFF を表す select の値 (空文字)。曜日は '0'〜'6'。 */
const OFF_VALUE = '';

const WEEKDAY_OPTIONS: { value: string; label: string }[] = [
  { value: OFF_VALUE, label: '通知しない (OFF)' },
  { value: '0', label: '日曜日' },
  { value: '1', label: '月曜日' },
  { value: '2', label: '火曜日' },
  { value: '3', label: '水曜日' },
  { value: '4', label: '木曜日' },
  { value: '5', label: '金曜日' },
  { value: '6', label: '土曜日' },
];

function weekdayToValue(weekday: number | null | undefined): string {
  if (weekday === null || weekday === undefined) return OFF_VALUE;
  return String(weekday);
}

/**
 * プロフィールページの通知設定セクション。
 *
 * - GET /api/preferences で現在の配信曜日を取得
 * - 曜日 Select を 1 つ表示 (OFF / 日〜土)
 * - 配信時刻は JST 11:00 固定 (cron 側で制御)
 * - 保存時:
 *   - OFF 以外を選択 → Push 購読を確実化して /api/push/subscribe に登録
 *   - OFF を選択 → ブラウザの購読を解除して /api/push/unsubscribe に通知
 *   - いずれも PUT /api/preferences で reminder_weekday を永続化
 */
export function NotificationSettings() {
  const { showToast } = useToast();
  const { isInstalled, canInstall, isPrompting, promptInstall } = useInstallPrompt();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weekday, setWeekday] = useState<string>(OFF_VALUE);
  const [savedWeekday, setSavedWeekday] = useState<string>(OFF_VALUE);
  // インストール状態と UA 判定は SSR と一致しないため、マウント後に評価する
  // (hydration mismatch を避けるため、確定するまで案内を描画しない)。
  const [mounted, setMounted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsIOS(isIOSDevice());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/preferences');
        if (!res.ok) throw new Error('通知設定の取得に失敗しました。');
        const data = (await res.json()) as {
          preferences?: { notification_preferences?: NotificationPreferences };
        };
        if (cancelled) return;
        const value = weekdayToValue(data.preferences?.notification_preferences?.reminder_weekday);
        setWeekday(value);
        setSavedWeekday(value);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : '通知設定の取得に失敗しました。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) {
      showToast('このブラウザはプッシュ通知に対応していません。', 'error');
      return false;
    }
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
    if (!vapidPublicKey) {
      showToast('プッシュ通知の設定が完了していません。', 'error');
      return false;
    }
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      showToast('通知の許可が得られませんでした。', 'warning');
      return false;
    }
    const subscription = await subscribeToPush(vapidPublicKey);
    const res = await apiFetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || 'プッシュ通知の登録に失敗しました。');
    }
    return true;
  }, [showToast]);

  const disablePush = useCallback(async (): Promise<void> => {
    const endpoint = await unsubscribeFromPush();
    if (!endpoint) return;
    await apiFetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  }, []);

  const handleInstall = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      showToast('インストールしました。通知を有効にできます。', 'success');
    }
  }, [promptInstall, showToast]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const reminderWeekday = weekday === OFF_VALUE ? null : Number(weekday);

      if (reminderWeekday !== null) {
        const ok = await enablePush();
        if (!ok) return;
      } else {
        await disablePush();
      }

      const res = await apiFetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_preferences: { reminder_weekday: reminderWeekday } }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || '通知設定の保存に失敗しました。');
      }

      setSavedWeekday(weekday);
      showToast('通知設定を保存しました。', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '通知設定の保存に失敗しました。', 'error');
    } finally {
      setSaving(false);
    }
  }, [weekday, enablePush, disablePush, showToast]);

  const dirty = weekday !== savedWeekday;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6" aria-labelledby="notification-settings-title">
      <h2 id="notification-settings-title" className="text-lg font-semibold text-gray-900">
        通知設定
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        毎週、選択した曜日の朝 11:00（日本時間）に振り返りのリマインダーをお送りします。
      </p>

      {/* すでにホーム画面に追加 (standalone) 済みなら案内は出さない。 */}
      {mounted && !isInstalled && (
        <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <p className="font-medium">📱 通知を受け取るにはインストールが必要です</p>
          <p className="mt-1">
            ReflectHub をホーム画面に追加（インストール）したアプリから通知を受け取れます。
            {isIOS && ' iPhone / iPad では、Safari のタブからは通知を受け取れません。'}
          </p>
          {canInstall ? (
            <div className="mt-2">
              <Button size="sm" onClick={handleInstall} disabled={isPrompting}>
                {isPrompting ? 'インストール中…' : 'アプリをインストール'}
              </Button>
            </div>
          ) : isIOS ? (
            <ol className="mt-2 list-decimal space-y-0.5 pl-4">
              <li>Safari の共有ボタン（□に↑）をタップ</li>
              <li>「ホーム画面に追加」を選択</li>
              <li>追加したアイコンからアプリを開く</li>
            </ol>
          ) : null}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">読み込み中...</p>
      ) : loadError ? (
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor="reminder-weekday" className="block text-sm font-medium text-gray-700">
              通知する曜日
            </label>
            <select
              id="reminder-weekday"
              value={weekday}
              disabled={saving}
              onChange={(e) => setWeekday(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {WEEKDAY_OPTIONS.map((opt) => (
                <option key={opt.value || 'off'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
