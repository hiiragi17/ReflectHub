-- =============================================================================
-- Google ログインユーザーの名前が 'Test User' になる問題の修正 (Issue #56 再発)
-- =============================================================================
--
-- 原因:
--   auth.users の AFTER INSERT トリガー (on_auth_user_created) が実行する
--   handle_new_user_simple() が、profiles.name に 'Test User' をハードコード
--   していた。アプリ側 (/api/auth/session) のログイン時上書きは、OAuth
--   コールバックの経路によってはスキップされるため、新規登録ユーザーの名前が
--   'Test User' のまま残っていた。
--
-- このスクリプトの内容 (ベキ等・再実行可):
--   1. handle_new_user_simple() を、Google の user_metadata から名前を取得する
--      実装に置き換える (トリガー on_auth_user_created は同じ関数名を参照する
--      ため作り直し不要)
--   2. 既存の 'Test User' 行を auth.users のメタデータで一括修復する
--
-- Supabase SQL Editor に貼り付けて実行すること。
-- =============================================================================

-- 1) トリガー関数の置き換え
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- 名前の優先順位はアプリ側 (/api/auth/session) と同じ:
    -- full_name → name → メールの @ 前 → 'ユーザー'
    INSERT INTO public.profiles (id, email, name, provider)
    VALUES (
        NEW.id,
        NEW.email,
        LEFT(COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
            'ユーザー'
        ), 100),
        -- トリガーは全プロバイダの新規ユーザーで発火するため、provider は
        -- raw_app_meta_data から動的に取得する (LINE ログイン追加時もそのまま
        -- 動く)。取得できない場合は従来挙動と同じ 'google' にフォールバック。
        COALESCE(NEW.raw_app_meta_data->>'provider', 'google')
    )
    -- アプリ側 (/api/auth/session, /api/auth/profile) が先に作成していても
    -- 衝突エラーで auth.users への INSERT ごと失敗しないようにする
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- 2) 既存の 'Test User' 行を修復
--    (ユーザーが手動で変更した名前には触れない: name = 'Test User' の行のみ)
UPDATE public.profiles p
SET name = LEFT(COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
        NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
        'ユーザー'
    ), 100),
    updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND p.name = 'Test User';

-- 動作確認:
--   SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user_simple';
--   SELECT count(*) FROM public.profiles WHERE name = 'Test User';  -- 0 になるはず
