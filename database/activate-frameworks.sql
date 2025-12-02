-- ========================================
-- フレームワーク有効化SQL
-- UI実装完了後に実行してください
-- ========================================

-- 新規追加した10個のフレームワークを有効化
UPDATE frameworks
SET is_active = true
WHERE id IN (
  'daki',   -- DAKI
  'wlt',    -- WLT
  'msg',    -- MSG
  '4l',     -- 4L
  'wrap',   -- WRAP
  'star',   -- STAR
  'diary',  -- 振り返り日記
  'grew',   -- GREW
  'ooda',   -- OODA Loop
  '5why'    -- 5Why分析
);

-- 確認クエリ
SELECT id, name, display_name, is_active, sort_order
FROM frameworks
ORDER BY sort_order;

-- アクティブなフレームワーク数を確認（12個になるはず）
SELECT COUNT(*) as active_frameworks
FROM frameworks
WHERE is_active = true;
