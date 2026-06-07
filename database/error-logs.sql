-- =====================================================================
-- Error Logs テーブル
-- =====================================================================
-- Phase 2.4 (issue #68) で API ルート `src/app/api/logs/errors/route.ts`
-- が追加された際に DB migration が書き漏れていたため、本ファイルで補う。
-- フロントエンドからの uncaught_error / unhandled_rejection 等を
-- バッチ送信で受け取り、本テーブルに保存する。
-- =====================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  -- クライアント側で生成される ID (UUID 文字列)。
  -- 同一エラーの重複送信を防ぐ目的で primary key として扱う。
  id TEXT PRIMARY KEY,

  -- 未認証ユーザーからのエラーも受け付けるため nullable。
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- src/types/errorTracking.ts の ErrorCategory に対応:
  -- 'uncaught_error' | 'unhandled_rejection' | 'network' | 'offline' |
  -- 'validation' | 'authentication' | 'authorization' | 'not_found' |
  -- 'server' | 'unknown'
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  status_code INTEGER,

  -- src/types/errorTracking.ts の ErrorSeverity に対応:
  -- 'critical' | 'error' | 'warning' | 'info'
  severity TEXT NOT NULL,

  -- 追加コンテキスト (ErrorTrackingContext)。
  page TEXT,
  action TEXT,
  url TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB,

  -- 解決状況の管理用 (route.ts GET ハンドラが返す)。
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GET /api/logs/errors は user_id でフィルタ + created_at DESC で並べるため、
-- 複合インデックスを張る。pagination もこのインデックスで効く。
CREATE INDEX IF NOT EXISTS error_logs_user_created_idx
  ON error_logs (user_id, created_at DESC);

-- 重大度別の集計用 (未使用だが将来のダッシュボード想定)。
CREATE INDEX IF NOT EXISTS error_logs_severity_idx
  ON error_logs (severity);

-- RLS 有効化
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは自分のログのみ参照可能。
DROP POLICY IF EXISTS "Users can view own error logs" ON error_logs;
CREATE POLICY "Users can view own error logs"
  ON error_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 認証済みユーザーは自分の user_id 付きログを INSERT 可能。
DROP POLICY IF EXISTS "Users can insert own error logs" ON error_logs;
CREATE POLICY "Users can insert own error logs"
  ON error_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 未認証ユーザー (ログイン前のクラッシュなど) は user_id NULL でのみ INSERT 可能。
-- これによりクライアント側のユーザー詐称を防ぐ。
DROP POLICY IF EXISTS "Anon can insert anonymous error logs" ON error_logs;
CREATE POLICY "Anon can insert anonymous error logs"
  ON error_logs FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Data API ロールへの権限付与
-- (2026-05-30 以降の Supabase 仕様変更対応。詳細は database/README.md)
GRANT INSERT ON public.error_logs TO anon;
GRANT SELECT, INSERT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;
