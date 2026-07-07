-- notification_preferences に「配信時刻 (reminder_hour)」を追加する。
--
-- 旧モデル: { reminder_weekday: 0-6 | null }              (配信時刻は JST 11:00 固定)
-- 新モデル: { reminder_weekday: 0-6 | null, reminder_hour: 0-23 }
--
-- reminder_hour は JST の「時」(0〜23)。配信ジョブ (pg_cron) は毎時起動し、
-- アプリ側が「JST での今の曜日・時」とユーザー設定を突き合わせて配信対象を決める
-- (daily-reminder-pg-cron.sql / src/services/reminderService.ts を参照)。
--
-- 既存ユーザーは従来の固定配信時刻 (11 時) で初期化するため、通知の挙動は変わらない。
-- このスクリプトはベキ等 (再実行可能)。
--
-- 既存テーブルが前提なので、GRANT は push-subscriptions-and-preferences.sql で
-- 付与済み (ここでは追加不要)。

-- 1) デフォルト値に reminder_hour を追加
ALTER TABLE user_preferences
  ALTER COLUMN notification_preferences
  SET DEFAULT '{"reminder_weekday": null, "reminder_hour": 11}'::jsonb;

-- 2) reminder_hour キーを持たない既存行にのみ 11 (従来の固定時刻) を補完する。
-- キーを持つ行は対象外なので、再実行してもユーザーが設定済みの時刻を上書きしない。
UPDATE user_preferences
  SET notification_preferences = notification_preferences || '{"reminder_hour": 11}'::jsonb
  WHERE NOT (notification_preferences ? 'reminder_hour');
