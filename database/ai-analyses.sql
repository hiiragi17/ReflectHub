-- AI 分析結果テーブル
-- 振り返り（retrospectives）に対する OpenAI ベースの分析結果を保存する。
-- 1 振り返りに対して複数回の分析を保持できる（ユーザーは最新を見るが、履歴も追える）。

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
  -- レート制限の原子化のための予約フラグ。
  -- false: スロット予約のみされた状態（OpenAI 呼び出し中、または失敗で残留）
  -- true:  分析が完了して書き込まれた状態
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_analyses_user_created_idx
  ON ai_analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_analyses_reflection_idx
  ON ai_analyses (reflection_id, created_at DESC);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai analyses" ON ai_analyses;
CREATE POLICY "Users can view own ai analyses"
  ON ai_analyses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai analyses" ON ai_analyses;
CREATE POLICY "Users can insert own ai analyses"
  ON ai_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ai analyses" ON ai_analyses;
CREATE POLICY "Users can update own ai analyses"
  ON ai_analyses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai analyses" ON ai_analyses;
CREATE POLICY "Users can delete own ai analyses"
  ON ai_analyses FOR DELETE
  USING (auth.uid() = user_id);

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


-- レート制限のための原子的なスロット予約 RPC。
-- pg_advisory_xact_lock でユーザー単位に直列化した上で「直近 N 時間の使用回数を数えて、
-- 上限未満なら予約行を INSERT」までを 1 トランザクションで行う。
-- 呼び出し側は、OpenAI 失敗時には予約行を DELETE、成功時には is_complete=true で UPDATE する。
CREATE OR REPLACE FUNCTION reserve_ai_analysis_slot(
  p_reflection_id UUID,
  p_max_per_window INTEGER DEFAULT 3,
  p_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  reservation_id UUID,
  used INTEGER,
  oldest_in_window TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_used INTEGER;
  v_oldest TIMESTAMPTZ;
  v_reservation_id UUID;
  v_window_start TIMESTAMPTZ;
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

  v_window_start := now() - (p_window_hours || ' hours')::INTERVAL;

  -- 同一ユーザーの並行リクエストを直列化（トランザクション終了で解放）
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  SELECT count(*)::INTEGER, min(created_at)
  INTO v_used, v_oldest
  FROM ai_analyses
  WHERE user_id = v_user_id
    AND created_at >= v_window_start;

  IF v_used >= p_max_per_window THEN
    reservation_id := NULL;
    used := v_used;
    oldest_in_window := v_oldest;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO ai_analyses (user_id, reflection_id, is_complete)
  VALUES (v_user_id, p_reflection_id, false)
  RETURNING id INTO v_reservation_id;

  reservation_id := v_reservation_id;
  used := v_used + 1;
  oldest_in_window := v_oldest;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION reserve_ai_analysis_slot(UUID, INTEGER, INTEGER) TO authenticated;
