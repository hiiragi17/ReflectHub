-- 重複通知防止 (idempotency) のため、最後に通知した時刻を記録するカラムを追加。
-- Cron tolerance window と reminder_time の組合せで 1 ユーザーが日に複数回通知されるのを防ぐ。
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- 同日中の通知済み判定で頻繁に参照されるためインデックスを張る。
CREATE INDEX IF NOT EXISTS user_preferences_last_notified_at_idx
  ON user_preferences (last_notified_at);
