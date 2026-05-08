'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Clock, Globe, Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/api/apiClient';
import {
  getCurrentSubscription,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/client';
import type { NotificationPreferences, UserPreferences } from '@/types/push';

export type ReminderFrequency = 'off' | 'daily' | 'weekly';

interface NotificationSettingsProps {
  /**
   * 任意のオーバーライド (主にテスト用)。本番では NEXT_PUBLIC_VAPID_PUBLIC_KEY を読む。
   */
  vapidPublicKey?: string;
}

const HHMM_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Tokyo', label: '日本標準時 (Asia/Tokyo)' },
  { value: 'UTC', label: '協定世界時 (UTC)' },
  { value: 'America/Los_Angeles', label: 'アメリカ西部 (America/Los_Angeles)' },
  { value: 'America/New_York', label: 'アメリカ東部 (America/New_York)' },
  { value: 'Europe/London', label: 'イギリス (Europe/London)' },
  { value: 'Europe/Berlin', label: 'ヨーロッパ中部 (Europe/Berlin)' },
  { value: 'Asia/Shanghai', label: '中国 (Asia/Shanghai)' },
  { value: 'Asia/Seoul', label: '韓国 (Asia/Seoul)' },
  { value: 'Asia/Singapore', label: 'シンガポール (Asia/Singapore)' },
  { value: 'Australia/Sydney', label: 'オーストラリア東部 (Australia/Sydney)' },
];

function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function frequencyFromPreferences(np: NotificationPreferences): ReminderFrequency {
  if (np.daily_reminder) return 'daily';
  if (np.weekly_summary) return 'weekly';
  return 'off';
}

function preferencesFromFrequency(freq: ReminderFrequency): {
  daily_reminder: boolean;
  weekly_summary: boolean;
} {
  return {
    daily_reminder: freq === 'daily',
    weekly_summary: freq === 'weekly',
  };
}

export function NotificationSettings({ vapidPublicKey }: NotificationSettingsProps) {
  const { showToast } = useToast();
  const resolvedVapidKey =
    vapidPublicKey ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [frequency, setFrequency] = useState<ReminderFrequency>('off');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [timezone, setTimezone] = useState('Asia/Tokyo');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [initial, setInitial] = useState<{
    frequency: ReminderFrequency;
    reminderTime: string;
    timezone: string;
  } | null>(null);

  const pushSupported = useMemo(
    () => (typeof window === 'undefined' ? true : isPushSupported()),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiFetch('/api/preferences', { method: 'GET' });
        if (!res.ok) {
          throw new Error('通知設定の取得に失敗しました。');
        }
        const data = (await res.json()) as { preferences: UserPreferences };
        if (cancelled) return;

        const np = data.preferences.notification_preferences ?? {
          daily_reminder: false,
          weekly_summary: false,
          reminder_time: '20:00',
          achievement_alerts: true,
        };
        const freq = frequencyFromPreferences(np);
        const time = np.reminder_time && HHMM_PATTERN.test(np.reminder_time)
          ? np.reminder_time
          : '20:00';
        const tz = data.preferences.timezone || 'Asia/Tokyo';

        setFrequency(freq);
        setReminderTime(time);
        setTimezone(tz);
        setInitial({ frequency: freq, reminderTime: time, timezone: tz });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '通知設定の取得に失敗しました。';
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensurePushSubscription = useCallback(async (): Promise<boolean> => {
    if (!pushSupported) {
      showToast('このブラウザはプッシュ通知に対応していません。', 'warning');
      return false;
    }
    if (!resolvedVapidKey) {
      showToast('プッシュ通知の設定が完了していません。', 'error');
      return false;
    }

    const existing = await getCurrentSubscription();
    if (existing) return true;

    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      showToast('通知の許可が得られませんでした。', 'warning');
      return false;
    }

    const subscription = await subscribeToPush(resolvedVapidKey);
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
  }, [pushSupported, resolvedVapidKey, showToast]);

  const removePushSubscription = useCallback(async (): Promise<void> => {
    const endpoint = await unsubscribeFromPush();
    if (!endpoint) return;
    // 失敗してもユーザー操作は止めない (ローカルでは解除済み)
    await apiFetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => undefined);
  }, []);

  const handleSave = useCallback(async () => {
    setValidationError(null);

    if (frequency !== 'off' && !HHMM_PATTERN.test(reminderTime)) {
      setValidationError('通知時刻は HH:MM 形式 (00:00〜23:59) で入力してください。');
      return;
    }
    if (!isValidTimezone(timezone)) {
      setValidationError('タイムゾーンが不正です。');
      return;
    }

    setSaving(true);
    try {
      const wasOff = initial?.frequency === 'off';
      const turningOn = wasOff && frequency !== 'off';
      const turningOff = !wasOff && frequency === 'off';

      if (turningOn) {
        const ok = await ensurePushSubscription();
        if (!ok) {
          setSaving(false);
          return;
        }
      }

      const { daily_reminder, weekly_summary } = preferencesFromFrequency(frequency);
      const body = {
        timezone,
        notification_preferences: {
          daily_reminder,
          weekly_summary,
          reminder_time: reminderTime,
        },
      };

      const res = await apiFetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || '通知設定の保存に失敗しました。');
      }

      if (turningOff) {
        await removePushSubscription();
      }

      setInitial({ frequency, reminderTime, timezone });
      showToast('通知設定を保存しました。', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '通知設定の保存に失敗しました。';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }, [
    frequency,
    reminderTime,
    timezone,
    initial,
    ensurePushSubscription,
    removePushSubscription,
    showToast,
  ]);

  const dirty =
    !!initial &&
    (initial.frequency !== frequency ||
      initial.reminderTime !== reminderTime ||
      initial.timezone !== timezone);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {frequency === 'off' ? (
            <BellOff className="w-5 h-5 text-gray-500" />
          ) : (
            <Bell className="w-5 h-5 text-gray-700" />
          )}
          <div>
            <CardTitle>通知設定</CardTitle>
            <CardDescription>
              リマインダーの頻度・時刻・タイムゾーンを設定できます
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loadError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
          >
            {loadError}
          </div>
        )}

        {!pushSupported && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            このブラウザはプッシュ通知に対応していません。設定の保存はできますが通知は届きません。
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reminder-frequency">通知頻度</Label>
          <Select
            value={frequency}
            onValueChange={(v) => setFrequency(v as ReminderFrequency)}
            disabled={loading || saving}
          >
            <SelectTrigger id="reminder-frequency" className="w-full">
              <SelectValue placeholder="頻度を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">毎日</SelectItem>
              <SelectItem value="weekly">週 1 回 (日曜)</SelectItem>
              <SelectItem value="off">OFF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminder-time" className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            通知時刻
          </Label>
          <Input
            id="reminder-time"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            disabled={loading || saving || frequency === 'off'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminder-timezone" className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            タイムゾーン
          </Label>
          <Select
            value={timezone}
            onValueChange={setTimezone}
            disabled={loading || saving}
          >
            <SelectTrigger id="reminder-timezone" className="w-full">
              <SelectValue placeholder="タイムゾーンを選択" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {validationError && (
          <p role="alert" className="text-sm text-red-600">
            {validationError}
          </p>
        )}

        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={loading || saving || !dirty}
            className="w-full sm:w-auto"
          >
            <Check className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
