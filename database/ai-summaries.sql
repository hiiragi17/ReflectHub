-- AI 期間サマリー分析テーブル
-- 振り返り（retrospectives）を期間（週・月・四半期）単位で横断的に分析した結果を保存する。
-- 「1 振り返り = 1 分析」では言い換えにしかならないため、複数件をまとめて分析することで
-- 「繰り返し出てくるテーマ」「定着した習慣」「最近出てきた課題」などの気づきを得る。
--
-- 書き込みはすべて SECURITY DEFINER の RPC 経由に限定する。
-- これによりクライアントが直接 INSERT/UPDATE/DELETE してクォータをバイパスしたり、
-- AI 生成コンテンツを書き換えたりすることを防ぐ。

CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('week', 'month', 'quarter')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  reflection_count INTEGER NOT NULL DEFAULT 0,
  recurring_themes JSONB NOT NULL DEFAULT '[]'::JSONB,
  sustained_practices JSONB NOT NULL DEFAULT '[]'::JSONB,
  emerging_challenges JSONB NOT NULL DEFAULT '[]'::JSONB,
  growth_summary TEXT NOT NULL DEFAULT '',
  mood_trend TEXT NOT NULL DEFAULT 'stable'
    CHECK (mood_trend IN ('improving', 'stable', 'declining')),
  recommendations JSONB NOT NULL DEFAULT '{"actions":[],"focus_areas":[]}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_summaries_user_created_idx
  ON ai_summaries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_summaries_user_period_idx
  ON ai_summaries (user_id, period, period_start DESC);

CREATE INDEX IF NOT EXISTS ai_summaries_pending_expiry_idx
  ON ai_summaries (user_id, expires_at)
  WHERE is_complete = false;

ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai summaries" ON ai_summaries;
CREATE POLICY "Users can view own ai summaries"
  ON ai_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_ai_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_summaries_updated_at ON ai_summaries;
CREATE TRIGGER ai_summaries_updated_at
  BEFORE UPDATE ON ai_summaries
  FOR EACH ROW EXECUTE FUNCTION update_ai_summaries_updated_at();


-- =====================================================================
-- スロット予約 RPC（SECURITY DEFINER）
-- =====================================================================
-- pg_advisory_xact_lock でユーザー単位に直列化し、24h ローリングで
-- p_max_per_window 件まで予約を許可する。
-- 同一 period_start の連続生成も同時に拒否する（同じ期間を再生成しようとするケース）。

DROP FUNCTION IF EXISTS reserve_ai_summary_slot(TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION reserve_ai_summary_slot(
  p_period TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_max_per_window INTEGER DEFAULT 2,
  p_window_hours INTEGER DEFAULT 24,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS TABLE(
  reservation_id UUID,
  used INTEGER,
  next_available_at TIMESTAMPTZ,
  duplicate BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_used INTEGER;
  v_next_available TIMESTAMPTZ;
  v_reservation_id UUID;
  v_window_start TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_window_interval INTERVAL;
  v_duplicate BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF p_period NOT IN ('week', 'month', 'quarter') THEN
    RAISE EXCEPTION 'invalid period' USING ERRCODE = '22023';
  END IF;
  IF p_period_start IS NULL OR p_period_end IS NULL OR p_period_start > p_period_end THEN
    RAISE EXCEPTION 'invalid period range' USING ERRCODE = '22023';
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

  v_window_interval := (p_window_hours || ' hours')::INTERVAL;
  v_window_start := now() - v_window_interval;
  v_expires_at := now() + (p_lease_seconds || ' seconds')::INTERVAL;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 同一 (period, period_start) を直近 5 分以内に「完了」しているなら重複扱い。
  -- created_at は予約時刻、updated_at は完了 UPDATE 時のトリガで上書きされるため、
  -- 完了直後の再生成を弾くには updated_at（= 完了時刻）を見る必要がある。
  -- 進行中（リース有効）の予約も重複扱いする。
  SELECT EXISTS (
    SELECT 1 FROM public.ai_summaries
    WHERE user_id = v_user_id
      AND period = p_period
      AND period_start = p_period_start
      AND (
        is_complete = true AND updated_at > now() - INTERVAL '5 minutes'
        OR (is_complete = false AND expires_at IS NOT NULL AND expires_at > now())
      )
  ) INTO v_duplicate;

  IF v_duplicate THEN
    reservation_id := NULL;
    used := NULL;
    next_available_at := NULL;
    duplicate := true;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT
    count(*)::INTEGER,
    min(
      CASE
        WHEN is_complete THEN created_at + v_window_interval
        ELSE expires_at
      END
    )
  INTO v_used, v_next_available
  FROM public.ai_summaries
  WHERE user_id = v_user_id
    AND created_at >= v_window_start
    AND (is_complete = true OR (expires_at IS NOT NULL AND expires_at > now()));

  IF v_used >= p_max_per_window THEN
    reservation_id := NULL;
    used := v_used;
    next_available_at := v_next_available;
    duplicate := false;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.ai_summaries (
    user_id, period, period_start, period_end, is_complete, expires_at
  )
  VALUES (
    v_user_id, p_period, p_period_start, p_period_end, false, v_expires_at
  )
  RETURNING id INTO v_reservation_id;

  reservation_id := v_reservation_id;
  used := v_used + 1;
  next_available_at := v_next_available;
  duplicate := false;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION reserve_ai_summary_slot(TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION reserve_ai_summary_slot(TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER) TO authenticated;


-- =====================================================================
-- 予約解放 RPC（SECURITY DEFINER）
-- =====================================================================

CREATE OR REPLACE FUNCTION release_ai_summary_slot(
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
    DELETE FROM public.ai_summaries
    WHERE id = p_reservation_id
      AND user_id = v_user_id
      AND is_complete = false
    RETURNING id
  )
  SELECT count(*)::INTEGER INTO v_deleted FROM deleted;

  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION release_ai_summary_slot(UUID) FROM public;
GRANT EXECUTE ON FUNCTION release_ai_summary_slot(UUID) TO authenticated;


-- =====================================================================
-- 分析完了 RPC（SECURITY DEFINER）
-- =====================================================================

CREATE OR REPLACE FUNCTION complete_ai_summary(
  p_reservation_id UUID,
  p_reflection_count INTEGER,
  p_recurring_themes JSONB,
  p_sustained_practices JSONB,
  p_emerging_challenges JSONB,
  p_growth_summary TEXT,
  p_mood_trend TEXT,
  p_recommendations JSONB,
  p_metadata JSONB
)
RETURNS public.ai_summaries AS $$
DECLARE
  v_user_id UUID;
  v_row public.ai_summaries;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF p_mood_trend NOT IN ('improving', 'stable', 'declining') THEN
    RAISE EXCEPTION 'invalid mood_trend' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ai_summaries
  SET reflection_count = COALESCE(p_reflection_count, 0),
      recurring_themes = COALESCE(p_recurring_themes, '[]'::JSONB),
      sustained_practices = COALESCE(p_sustained_practices, '[]'::JSONB),
      emerging_challenges = COALESCE(p_emerging_challenges, '[]'::JSONB),
      growth_summary = COALESCE(p_growth_summary, ''),
      mood_trend = p_mood_trend,
      recommendations = COALESCE(p_recommendations, '{"actions":[],"focus_areas":[]}'::JSONB),
      metadata = COALESCE(p_metadata, '{}'::JSONB),
      is_complete = true,
      expires_at = NULL
  WHERE id = p_reservation_id
    AND user_id = v_user_id
    AND is_complete = false
    AND expires_at IS NOT NULL
    AND expires_at > now()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation not found, already completed, or lease expired'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION complete_ai_summary(UUID, INTEGER, JSONB, JSONB, JSONB, TEXT, TEXT, JSONB, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION complete_ai_summary(UUID, INTEGER, JSONB, JSONB, JSONB, TEXT, TEXT, JSONB, JSONB) TO authenticated;
