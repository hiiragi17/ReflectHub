-- =====================================================================
-- Data API ロールへの権限付与（ベースライン）
-- =====================================================================
-- 2026-05-30 以降の新規 Supabase プロジェクトでは public スキーマのテーブルが
-- PostgREST / GraphQL / supabase-js から自動アクセス可能ではなくなる。
-- 既存プロジェクト（ReflectHub もこれ）は 2026-10-30 まで旧挙動だが、
-- それ以降に作る新テーブルは明示的な GRANT が必要になる。
-- 参考: https://github.com/orgs/supabase/discussions/45329
--
-- このファイルは「現状の public スキーマ全テーブルに対する想定 GRANT」を
-- ベキ等にまとめたもの。新環境を立てる際や、現行プロジェクトで
-- 期限前に明示権限付与を行いたい場合に流す。
--
-- 各テーブルへのアクセス経路と必要ロールはアプリ実装から逆算している:
--   profiles            : サーバ側 API ルート（cookie auth）→ authenticated
--   frameworks          : ブラウザ client から SELECT のみ → authenticated
--   retrospectives      : ブラウザ client から CRUD       → authenticated
--   push_subscriptions  : ブラウザ + reminder の service_role
--   user_preferences    : ブラウザ + reminder の service_role
--   error_logs          : POST は未ログインも許容 / GET は認証必須
--   ai_summaries        : ブラウザから SELECT のみ（書込みは RPC 経由）
--
-- 注意: 書き込みを禁じたいテーブル（例: ai_summaries）は SELECT のみ付与。
--       書込みは SECURITY DEFINER の RPC 関数経由に統一する設計を維持する。
-- =====================================================================

-- profiles --------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- frameworks ------------------------------------------------------------
-- マスタデータ。ログイン後のブラウザクライアントから読むだけ。
GRANT SELECT ON public.frameworks TO authenticated;
GRANT ALL ON public.frameworks TO service_role;

-- retrospectives --------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retrospectives TO authenticated;
GRANT ALL ON public.retrospectives TO service_role;

-- push_subscriptions / user_preferences ---------------------------------
-- push-subscriptions-and-preferences.sql と重複するが、既存 DB に対する
-- ベキ等な適用ができるよう同じ GRANT を再掲する。
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

-- error_logs ------------------------------------------------------------
-- POST /api/logs/errors は未認証ユーザーからのクライアントエラーも
-- 受け付けるため、anon にも INSERT を許可する。
-- 読み取り（GET）は認証ユーザーのみに制限。
GRANT INSERT ON public.error_logs TO anon;
GRANT SELECT, INSERT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

-- ai_summaries ----------------------------------------------------------
-- 書き込みは SECURITY DEFINER RPC 経由のみ。クライアントには SELECT だけ許可。
GRANT SELECT ON public.ai_summaries TO authenticated;
GRANT ALL ON public.ai_summaries TO service_role;

-- =====================================================================
-- 確認クエリ
-- =====================================================================
-- 付与済み権限を確認したい場合は以下を実行:
--
-- SELECT grantee, table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND grantee IN ('anon', 'authenticated', 'service_role')
-- GROUP BY grantee, table_name
-- ORDER BY table_name, grantee;
