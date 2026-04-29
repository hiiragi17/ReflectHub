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
  -- 予約のリース期限。is_complete=false の行が枠を消費する有効期限。
  -- 完了時 (is_complete=true への UPDATE 時) に NULL にする。
  -- 期限切れの未完了行は枠を消費しないとみなす（プロセスクラッシュ等で取り残された孤立行対策）。
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 既存環境向け: 後方互換のため expires_at が無いスキーマには ADD COLUMN
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ai_analyses_user_created_idx
  ON ai_analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_analyses_reflection_idx
  ON ai_analyses (reflection_id, created_at DESC);

-- 期限切れ未完了行の絞り込み用部分インデックス
CREATE INDEX IF NOT EXISTS ai_analyses_pending_expiry_idx
  ON ai_analyses (user_id, expires_at)
  WHERE is_complete = false;

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
-- pg_advisory_xact_lock でユーザー単位に直列化した上で
--  1) reflection の所有権チェック（直接 RPC 呼び出しのバイパス防止）
--  2) ウィンドウ内の有効な使用回数を数える（is_complete=true または expires_at>now() のみカウント）
--  3) 上限未満なら expires_at 付きの予約行を INSERT
-- までを 1 トランザクションで行う。
-- 呼び出し側は、OpenAI 失敗時には予約行を DELETE、成功時には is_complete=true / expires_at=NULL で UPDATE する。
CREATE OR REPLACE FUNCTION reserve_ai_analysis_slot(
  p_reflection_id UUID,
  p_max_per_window INTEGER DEFAULT 3,
  p_window_hours INTEGER DEFAULT 24,
  p_lease_seconds INTEGER DEFAULT 300
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
  v_expires_at TIMESTAMPTZ;
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

  -- reflection の所有権を RPC 内でも確認する。
  -- ルート以外（直接 RPC 呼び出し）からの実行でも、他ユーザーの reflection_id で
  -- ai_analyses を作成できないようにする。エラーコード 42501 (insufficient_privilege) を使用。
  IF NOT EXISTS (
    SELECT 1 FROM retrospectives
    WHERE id = p_reflection_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'reflection not found or not owned by user'
      USING ERRCODE = '42501';
  END IF;

  v_window_start := now() - (p_window_hours || ' hours')::INTERVAL;
  v_expires_at := now() + (p_lease_seconds || ' seconds')::INTERVAL;

  -- 同一ユーザーの並行リクエストを直列化（トランザクション終了で解放）
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 完了済み行 + リース期限内の未完了行のみカウント。
  -- 期限切れ予約行は孤立とみなしてカウントから除外する。
  SELECT count(*)::INTEGER, min(created_at)
  INTO v_used, v_oldest
  FROM ai_analyses
  WHERE user_id = v_user_id
    AND created_at >= v_window_start
    AND (is_complete = true OR (expires_at IS NOT NULL AND expires_at > now()));

  IF v_used >= p_max_per_window THEN
    reservation_id := NULL;
    used := v_used;
    oldest_in_window := v_oldest;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO ai_analyses (user_id, reflection_id, is_complete, expires_at)
  VALUES (v_user_id, p_reflection_id, false, v_expires_at)
  RETURNING id INTO v_reservation_id;

  reservation_id := v_reservation_id;
  used := v_used + 1;
  oldest_in_window := v_oldest;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION reserve_ai_analysis_slot(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

-- 古い 3 引数版（リース無し）を削除（存在する場合）。再 apply 時の重複定義を避ける。
DROP FUNCTION IF EXISTS reserve_ai_analysis_slot(UUID, INTEGER, INTEGER);
