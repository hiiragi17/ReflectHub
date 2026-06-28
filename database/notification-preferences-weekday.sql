-- notification_preferences を「配信曜日」モデルへ移行する。
--
-- 旧モデル: { daily_reminder, reminder_time, weekly_summary, achievement_alerts }
-- 新モデル: { reminder_weekday: 0-6 | null }   (0=日曜〜6=土曜、null = OFF)
--
-- 配信時刻は JST 11:00 固定 (Vercel Cron `0 2 * * *` UTC) になったため、
-- ユーザー設定は「配信する曜日」だけになる。
--
-- 既存行は OFF (reminder_weekday: null) に初期化する。
-- 旧 reminder_time には曜日の情報が無く、daily(毎日)/weekly(週1) の区別から
-- 曜日を一意に決められないため、移行ではなく一律リセットとし、ユーザーに
-- 再設定してもらう方針。
--
-- 既存テーブルが前提なので、GRANT は push-subscriptions-and-preferences.sql で
-- 付与済み (ここでは追加不要)。

-- 1) デフォルト値を新モデルに変更
ALTER TABLE user_preferences
  ALTER COLUMN notification_preferences
  SET DEFAULT '{"reminder_weekday": null}'::jsonb;

-- 2) 旧モデルの行だけを OFF にリセットする。
-- 旧フォーマット (daily_reminder 等のキーを持つ行) のみを対象にすることで、
-- スクリプトを再実行しても、既に新モデルへ移行済み (reminder_weekday を設定済み)
-- のユーザーの選択を上書きしない。
UPDATE user_preferences
  SET notification_preferences = '{"reminder_weekday": null}'::jsonb
  WHERE notification_preferences ?| ARRAY[
    'daily_reminder',
    'weekly_summary',
    'reminder_time',
    'achievement_alerts'
  ];
