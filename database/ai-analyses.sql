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
