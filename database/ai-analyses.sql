-- AI 分析結果テーブル
-- 振り返り（retrospectives）に対する OpenAI ベースの分析結果を保存する。
-- 1 振り返りに対して複数回の分析を保持できる（ユーザーは最新を見るが、履歴も追える）。
--
-- 書き込みはすべて SECURITY DEFINER の RPC 経由に限定する。
-- これによりクライアントが直接 INSERT/UPDATE/DELETE してクォータ・AI 生成内容の不変条件を
-- バイパスすることを防ぐ（例: 完了行の自作、生成済みフィールドの書き換え、枠を空けるための削除）。

CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_id UUID NOT NULL REFERENCES retrospectives(id) ON DELETE CASCADE,
  growth_points JSONB NOT NULL DEFAULT '[]'::JSONB,
  improvement_suggestions JSONB NOT NULL DEFAULT '[]'::JSONB,
  emotional_trend TEXT NOT NULL DEFAULT 'neutral'
    CHECK (emotional_trend IN ('positive', 'neutral', 'negative')),
  key_achievements JSONB NOT NULL DEFAULT '[]'::JSONB,
  challenges JSONB NOT NULL DEFAULT '[]'::JSONB,
  recommendations JSONB NOT NULL DEFAULT '{"actions":[],"focus_areas":[]}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 既存環境向け
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ai_analyses_user_created_idx
  ON ai_analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_analyses_reflection_idx
  ON ai_analyses (reflection_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_analyses_pending_expiry_idx
  ON ai_analyses (user_id, expires_at)
  WHERE is_complete = false;

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- クライアントの SELECT のみ許可。書き込みポリシーは持たせない。
DROP POLICY IF EXISTS "Users can view own ai analyses" ON ai_analyses;
CREATE POLICY "Users can view own ai analyses"
  ON ai_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- 古い書き込みポリシーが残っていれば DROP（新規環境では存在しないが既存環境向け）
DROP POLICY IF EXISTS "Users can insert own ai analyses" ON ai_analyses;
DROP POLICY IF EXISTS "Users can update own ai analyses" ON ai_analyses;
DROP POLICY IF EXISTS "Users can delete own ai analyses" ON ai_analyses;

CREATE OR REPLACE FUNCTION update_ai_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_analyses_updated_at ON ai_analyses;
CREATE TRIGGER ai_analyses_updated_at
  BEFORE UPDATE ON ai_analyses
  FOR EACH ROW EXECUTE FUNCTION update_ai_analyses_updated_at();


-- =====================================================================
-- スロット予約 RPC（SECURITY DEFINER）
-- =====================================================================
-- pg_advisory_xact_lock でユーザー単位に直列化した上で
--   1) reflection の所有権チェック
--   2) ウィンドウ内の有効使用回数（is_complete または未期限の予約のみ）を集計
--   3) 上限未満なら expires_at 付き予約行を INSERT
-- までを 1 トランザクションで行う。
--
-- 戻り値の next_available_at は「次に枠が 1 つ解放される時刻」。
--   - 完了行は created_at + p_window_hours 後に枠から外れる。
--   - 未完了行は expires_at で枠から外れる（リース切れ）。
--   - 集計対象行ごとに上記の解放時刻を計算し、その最小値を返す。
-- ルート側はこれをそのまま reset_at として返せる。

DROP FUNCTION IF EXISTS reserve_ai_analysis_slot(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS reserve_ai_analysis_slot(UUID, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION reserve_ai_analysis_slot(
  p_reflection_id UUID,
  p_max_per_window INTEGER DEFAULT 3,
  p_window_hours INTEGER DEFAULT 24,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS TABLE(
  reservation_id UUID,
  used INTEGER,
  next_available_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_used INTEGER;
  v_next_available TIMESTAMPTZ;
  v_reservation_id UUID;
  v_window_start TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_window_interval INTERVAL;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF p_max_per_window IS NULL OR p_max_per_window <= 0 THEN
    RAISE EXCEPTION 'invalid max_per_window' USING ERRCODE = '22023';
  END IF;
  IF p_window_hours IS NULL OR p_window_hours <= 0 THEN
    RAISE EXCEPTION 'invalid window_hours' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds IS NULL OR p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'invalid lease_seconds' USING ERRCODE = '22023';
  END IF;

  -- RPC 直叩きでも他ユーザーの reflection_id を使えないようにする
  IF NOT EXISTS (
    SELECT 1 FROM public.retrospectives
    WHERE id = p_reflection_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'reflection not found or not owned by user'
      USING ERRCODE = '42501';
  END IF;

  v_window_interval := (p_window_hours || ' hours')::INTERVAL;
  v_window_start := now() - v_window_interval;
  v_expires_at := now() + (p_lease_seconds || ' seconds')::INTERVAL;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 完了行 + 期限内の予約行のみカウント。
  -- 各行が枠から解放される時刻を行ごとに算出し、その最小値を「次に空く時刻」とする。
  SELECT
    count(*)::INTEGER,
    min(
      CASE
        WHEN is_complete THEN created_at + v_window_interval
        ELSE expires_at
      END
    )
  INTO v_used, v_next_available
  FROM public.ai_analyses
  WHERE user_id = v_user_id
    AND created_at >= v_window_start
    AND (is_complete = true OR (expires_at IS NOT NULL AND expires_at > now()));

  IF v_used >= p_max_per_window THEN
    reservation_id := NULL;
    used := v_used;
    next_available_at := v_next_available;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.ai_analyses (user_id, reflection_id, is_complete, expires_at)
  VALUES (v_user_id, p_reflection_id, false, v_expires_at)
  RETURNING id INTO v_reservation_id;

  reservation_id := v_reservation_id;
  used := v_used + 1;
  next_available_at := v_next_available;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION reserve_ai_analysis_slot(UUID, INTEGER, INTEGER, INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION reserve_ai_analysis_slot(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;


-- =====================================================================
-- 予約解放 RPC（SECURITY DEFINER）
-- =====================================================================
-- OpenAI 呼び出しが失敗したときにルートから呼び、当該予約行を削除して枠を解放する。
-- - 自分の予約行のみ削除可（auth.uid() で所有権チェック）
-- - is_complete=true の完了行は削除しない（クライアントが過去の分析履歴を消せないようにする）

CREATE OR REPLACE FUNCTION release_ai_analysis_slot(
  p_reservation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_deleted INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  WITH deleted AS (
    DELETE FROM public.ai_analyses
    WHERE id = p_reservation_id
      AND user_id = v_user_id
      AND is_complete = false
    RETURNING id
  )
  SELECT count(*)::INTEGER INTO v_deleted FROM deleted;

  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION release_ai_analysis_slot(UUID) FROM public;
GRANT EXECUTE ON FUNCTION release_ai_analysis_slot(UUID) TO authenticated;


-- =====================================================================
-- 分析完了 RPC（SECURITY DEFINER）
-- =====================================================================
-- OpenAI 呼び出しが成功したときにルートから呼び、予約行を完了状態に更新する。
-- 既に is_complete=true の行は更新しない（生成済み分析の改ざん防止）。
-- 戻り値は更新後の行（クライアントの再 SELECT を不要にする）。

CREATE OR REPLACE FUNCTION complete_ai_analysis(
  p_reservation_id UUID,
  p_growth_points JSONB,
  p_improvement_suggestions JSONB,
  p_emotional_trend TEXT,
  p_key_achievements JSONB,
  p_challenges JSONB,
  p_recommendations JSONB,
  p_metadata JSONB
)
RETURNS public.ai_analyses AS $$
DECLARE
  v_user_id UUID;
  v_row public.ai_analyses;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF p_emotional_trend NOT IN ('positive', 'neutral', 'negative') THEN
    RAISE EXCEPTION 'invalid emotional_trend' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ai_analyses
  SET growth_points = COALESCE(p_growth_points, '[]'::JSONB),
      improvement_suggestions = COALESCE(p_improvement_suggestions, '[]'::JSONB),
      emotional_trend = p_emotional_trend,
      key_achievements = COALESCE(p_key_achievements, '[]'::JSONB),
      challenges = COALESCE(p_challenges, '[]'::JSONB),
      recommendations = COALESCE(p_recommendations, '{"actions":[],"focus_areas":[]}'::JSONB),
      metadata = COALESCE(p_metadata, '{}'::JSONB),
      is_complete = true,
      expires_at = NULL
  WHERE id = p_reservation_id
    AND user_id = v_user_id
    AND is_complete = false
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation not found or already completed'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION complete_ai_analysis(UUID, JSONB, JSONB, TEXT, JSONB, JSONB, JSONB, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION complete_ai_analysis(UUID, JSONB, JSONB, TEXT, JSONB, JSONB, JSONB, JSONB) TO authenticated;
