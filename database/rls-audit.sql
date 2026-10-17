-- =============================================================================
-- RLS・権限の点検用クエリ (すべて読み取り専用。何も変更しない)
-- =============================================================================
--
-- 背景:
--   profiles / retrospectives / frameworks / ai_summaries の CREATE TABLE と
--   RLS ポリシーは、このリポジトリのどの SQL にも書かれていない。
--   retrospectives などはブラウザから直接 (anon キー + ログイン中の JWT で)
--   アクセスされるため、他人のデータを守っているのは RLS だけになる。
--   本番 (Supabase) の実際の設定を、Supabase SQL Editor で下のクエリを順に実行して
--   確認する。結果の期待値は docs/security/rls-audit.md を参照。
-- =============================================================================

-- 1) public スキーマの全テーブルで RLS が有効か。
--    期待: rls_enabled がすべて true。false のテーブルは anon キーで全件読み書きできる。
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- 2) 全ポリシーの一覧。
--    確認点: retrospectives / profiles に「自分の行のみ」(auth.uid() = user_id / id) の
--    SELECT / INSERT / UPDATE / DELETE が揃っているか。
--    qual (USING) が true だけのポリシー、roles に public / anon が含まれる書き込み
--    ポリシー、with_check が空の INSERT / UPDATE があれば要対応。
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 3) anon / authenticated に付与されているテーブル権限。
--    確認点: anon に error_logs の INSERT 以外が付いていないこと。
--    authenticated の profiles への UPDATE が全列であること (列を絞れるか検討)。
SELECT grantee, table_name,
       string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

-- 4) public スキーマの関数と、EXECUTE できるロール。
--    確認点: SECURITY DEFINER の関数を anon / PUBLIC が呼べないこと
--    (関数はデフォルトで PUBLIC に EXECUTE が付く)。
--    ai_summaries の書き込み用 RPC (data-api-grants.sql のコメント参照) が
--    あるなら、検証 (auth.uid() の確認) を関数内で行っているか。
SELECT p.proname AS function_name,
       p.prosecdef AS security_definer,
       p.proconfig AS config,            -- search_path が固定されているか
       p.proacl AS acl,                  -- NULL = デフォルト (PUBLIC が実行可)
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 5) profiles の列。
--    確認点: role / is_admin / plan など、ユーザーが自分で書き換えてはいけない列が
--    ないか (authenticated は全列を UPDATE できる)。
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 6) ビュー (RLS を迂回しやすい)。
--    確認点: security_invoker = true になっているか (なければ所有者の権限で動き、
--    RLS を素通りする)。
SELECT c.relname AS view_name, c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v';
