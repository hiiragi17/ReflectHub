-- ========================================
-- ReflectHub Phase 2: フレームワーク拡張
-- YWT, KPT は既に存在するため、5個を追加して合計7個にする
-- 初期状態は is_active = false で、UI実装完了後に有効化する
-- ========================================

-- 追加する5フレームワーク（ソート順: 3-7）
INSERT INTO frameworks (id, name, display_name, description, schema, icon, color, is_active, sort_order) VALUES

('daki', 'DAKI', 'Drop・Add・Keep・Improve', 'プロセス改善に特化。より詳細な観点から振り返りを実施', '{
  "fields": [
    {"id": "d", "label": "Drop", "icon": "🗑️", "placeholder": "やめること", "type": "textarea", "required": false},
    {"id": "a", "label": "Add", "icon": "➕", "placeholder": "追加すること", "type": "textarea", "required": false},
    {"id": "k", "label": "Keep", "icon": "✅", "placeholder": "継続すること", "type": "textarea", "required": false},
    {"id": "i", "label": "Improve", "icon": "📈", "placeholder": "改善すること", "type": "textarea", "required": false}
  ]
}', '🔄', '#FF9800', false, 3),

('star', 'STAR', 'Situation・Task・Action・Result', 'キャリア面接や事例整理に最適。具体的なストーリーを構造化', '{
  "fields": [
    {"id": "situation", "label": "Situation", "icon": "🎬", "placeholder": "どんな状況・背景だったか？", "type": "textarea", "required": false},
    {"id": "task", "label": "Task", "icon": "📋", "placeholder": "与えられた課題・目標は何か？", "type": "textarea", "required": false},
    {"id": "action", "label": "Action", "icon": "⚡", "placeholder": "あなたが実施したアクション", "type": "textarea", "required": false},
    {"id": "result", "label": "Result", "icon": "🎯", "placeholder": "得られた結果・成果", "type": "textarea", "required": false}
  ]
}', '⭐', '#FF6B6B', false, 4),

('wlt', 'WLT', 'Win・Learn・Try', 'ポジティブな観点から振り返り。成功体験を軸に学習と挑戦をつなぐ', '{
  "fields": [
    {"id": "win", "label": "Win", "icon": "🏆", "placeholder": "成功したこと", "type": "textarea", "required": false},
    {"id": "learn", "label": "Learn", "icon": "📚", "placeholder": "学んだこと", "type": "textarea", "required": false},
    {"id": "try", "label": "Try", "icon": "🚀", "placeholder": "挑戦すること", "type": "textarea", "required": false}
  ]
}', '🏆', '#9C27B0', false, 5),

('4l', '4L', 'Liked・Learned・Lacked・Longed for', '研修やセミナー学習に最適。学習体験を多角的に分析', '{
  "fields": [
    {"id": "liked", "label": "Liked", "icon": "👍", "placeholder": "良かったこと", "type": "textarea", "required": false},
    {"id": "learned", "label": "Learned", "icon": "🎓", "placeholder": "学んだこと", "type": "textarea", "required": false},
    {"id": "lacked", "label": "Lacked", "icon": "❌", "placeholder": "不足していたこと", "type": "textarea", "required": false},
    {"id": "longed", "label": "Longed For", "icon": "🌟", "placeholder": "望むこと・期待", "type": "textarea", "required": false}
  ]
}', '4️⃣', '#00BCD4', false, 6),

('diary', '振り返り日記', '時系列日記形式', '時間軸に沿った自由記述。1日の流れを時間帯別に記録', '{
  "fields": [
    {"id": "time_morning", "label": "朝（AM）", "icon": "🌅", "placeholder": "朝のできごと・活動", "type": "textarea", "required": false},
    {"id": "time_afternoon", "label": "昼（PM）", "icon": "☀️", "placeholder": "午後のできごと・活動", "type": "textarea", "required": false},
    {"id": "time_evening", "label": "夜（PM）", "icon": "🌙", "placeholder": "夜のできごと・活動", "type": "textarea", "required": false},
    {"id": "reflection", "label": "本日の振り返り", "icon": "🤔", "placeholder": "総括・気づき・明日への誓い", "type": "textarea", "required": false}
  ]
}', '📔', '#FFA726', false, 7)

ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 確認クエリ
-- ========================================
-- 全フレームワークの確認
SELECT id, name, display_name, icon, color, sort_order
FROM frameworks
ORDER BY sort_order;

-- フレームワーク数の確認（7個になるはず）
SELECT COUNT(*) as total_frameworks FROM frameworks WHERE is_active = true;
