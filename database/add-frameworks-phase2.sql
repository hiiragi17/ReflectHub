-- ========================================
-- ReflectHub Phase 2: フレームワーク拡張
-- YWT, KPT は既に存在するため、残り10個を追加
-- ========================================

-- 既存DB未投入の5フレームワーク（ソート順: 3-7）
INSERT INTO frameworks (id, name, display_name, description, schema, icon, color, is_active, sort_order) VALUES

('daki', 'DAKI', 'Drop・Add・Keep・Improve', 'プロセス改善に特化。より詳細な観点から振り返りを実施', '{
  "fields": [
    {"id": "d", "label": "Drop", "icon": "🗑️", "placeholder": "やめること", "type": "textarea", "required": false},
    {"id": "a", "label": "Add", "icon": "➕", "placeholder": "追加すること", "type": "textarea", "required": false},
    {"id": "k", "label": "Keep", "icon": "✅", "placeholder": "継続すること", "type": "textarea", "required": false},
    {"id": "i", "label": "Improve", "icon": "📈", "placeholder": "改善すること", "type": "textarea", "required": false}
  ]
}', '🔄', '#FF9800', true, 3),

('wlt', 'WLT', 'Win・Learn・Try', 'ポジティブな観点から振り返り。成功体験を軸に学習と挑戦をつなぐ', '{
  "fields": [
    {"id": "win", "label": "Win", "icon": "🏆", "placeholder": "成功したこと", "type": "textarea", "required": false},
    {"id": "learn", "label": "Learn", "icon": "📚", "placeholder": "学んだこと", "type": "textarea", "required": false},
    {"id": "try", "label": "Try", "icon": "🚀", "placeholder": "挑戦すること", "type": "textarea", "required": false}
  ]
}', '🏆', '#9C27B0', true, 4),

('msg', 'MSG', '喜怒哀', '感情軸の振り返り。感じた喜び・怒り・哀しみから内省を深める', '{
  "fields": [
    {"id": "mad", "label": "Mad（怒）", "icon": "😠", "placeholder": "イライラしたこと・不満", "type": "textarea", "required": false},
    {"id": "sad", "label": "Sad（哀）", "icon": "😢", "placeholder": "悲しかったこと・残念なこと", "type": "textarea", "required": false},
    {"id": "glad", "label": "Glad（喜）", "icon": "😊", "placeholder": "嬉しかったこと・満足", "type": "textarea", "required": false}
  ]
}', '😊', '#E91E63', true, 5),

('4l', '4L', 'Liked・Learned・Lacked・Longed for', '研修やセミナー学習に最適。学習体験を多角的に分析', '{
  "fields": [
    {"id": "liked", "label": "Liked", "icon": "👍", "placeholder": "良かったこと", "type": "textarea", "required": false},
    {"id": "learned", "label": "Learned", "icon": "🎓", "placeholder": "学んだこと", "type": "textarea", "required": false},
    {"id": "lacked", "label": "Lacked", "icon": "❌", "placeholder": "不足していたこと", "type": "textarea", "required": false},
    {"id": "longed", "label": "Longed For", "icon": "🌟", "placeholder": "望むこと・期待", "type": "textarea", "required": false}
  ]
}', '4️⃣', '#00BCD4', true, 6),

('wrap', 'WRAP', 'Wishes・Risks・Appreciations・Puzzles', 'チーム振り返りに最適。多角的な視点を統合する', '{
  "fields": [
    {"id": "wishes", "label": "Wishes", "icon": "🌟", "placeholder": "願い・期待", "type": "textarea", "required": false},
    {"id": "risks", "label": "Risks", "icon": "⚠️", "placeholder": "リスク・懸念", "type": "textarea", "required": false},
    {"id": "appreciations", "label": "Appreciations", "icon": "🙏", "placeholder": "感謝・貢献", "type": "textarea", "required": false},
    {"id": "puzzles", "label": "Puzzles", "icon": "❓", "placeholder": "疑問・不明点", "type": "textarea", "required": false}
  ]
}', '🎁', '#795548', true, 7),

-- 新規追加の5フレームワーク（ソート順: 8-12）
('star', 'STAR', 'Situation・Task・Action・Result', 'キャリア面接や事例整理に最適。具体的なストーリーを構造化', '{
  "fields": [
    {"id": "situation", "label": "Situation", "icon": "🎬", "placeholder": "どんな状況・背景だったか？", "type": "textarea", "required": false},
    {"id": "task", "label": "Task", "icon": "📋", "placeholder": "与えられた課題・目標は何か？", "type": "textarea", "required": false},
    {"id": "action", "label": "Action", "icon": "⚡", "placeholder": "あなたが実施したアクション", "type": "textarea", "required": false},
    {"id": "result", "label": "Result", "icon": "🎯", "placeholder": "得られた結果・成果", "type": "textarea", "required": false}
  ]
}', '⭐', '#FF6B6B', true, 8),

('diary', '振り返り日記', '時系列日記形式', '時間軸に沿った自由記述。1日の流れを時間帯別に記録', '{
  "fields": [
    {"id": "time_morning", "label": "朝（AM）", "icon": "🌅", "placeholder": "朝のできごと・活動", "type": "textarea", "required": false},
    {"id": "time_afternoon", "label": "昼（PM）", "icon": "☀️", "placeholder": "午後のできごと・活動", "type": "textarea", "required": false},
    {"id": "time_evening", "label": "夜（PM）", "icon": "🌙", "placeholder": "夜のできごと・活動", "type": "textarea", "required": false},
    {"id": "reflection", "label": "本日の振り返り", "icon": "🤔", "placeholder": "総括・気づき・明日への誓い", "type": "textarea", "required": false}
  ]
}', '📔', '#FFA726', true, 9),

('grew', 'GREW', 'Goal・Reality・Options・Will', '目標管理者向け。目標達成に向けた意思決定を支援', '{
  "fields": [
    {"id": "goal", "label": "Goal", "icon": "🎯", "placeholder": "目標は何だったか？（期待値）", "type": "textarea", "required": false},
    {"id": "reality", "label": "Reality", "icon": "👁️", "placeholder": "現実はどうだったか？（実績値）", "type": "textarea", "required": false},
    {"id": "options", "label": "Options", "icon": "🔀", "placeholder": "どんな選択肢・方法がある？", "type": "textarea", "required": false},
    {"id": "will", "label": "Will", "icon": "💪", "placeholder": "次はどうする？（決意・コミットメント）", "type": "textarea", "required": false}
  ]
}', '🏃', '#64B5F6', true, 10),

('ooda', 'OODA Loop', 'Observe・Orient・Decide・Act', 'エンジニア向け。素早い改善ループと意思決定プロセス', '{
  "fields": [
    {"id": "observe", "label": "Observe", "icon": "👀", "placeholder": "何を観察・検出したか？", "type": "textarea", "required": false},
    {"id": "orient", "label": "Orient", "icon": "🧭", "placeholder": "どう解釈・認識した？（経験・背景知識）", "type": "textarea", "required": false},
    {"id": "decide", "label": "Decide", "icon": "🤝", "placeholder": "どう判断・決定した？", "type": "textarea", "required": false},
    {"id": "act", "label": "Act", "icon": "🎬", "placeholder": "何をした？どんな結果が出た？", "type": "textarea", "required": false}
  ]
}', '🔄', '#42A5F5', true, 11),

('5why', '5Why分析', '5つのなぜ - 根本原因分析', '深掘り分析に最適。問題の根本原因を段階的に追求', '{
  "fields": [
    {"id": "issue", "label": "問題・現象", "icon": "❗", "placeholder": "実際に何が起きたか？", "type": "textarea", "required": false},
    {"id": "why1", "label": "なぜ？（1回目）", "icon": "❓", "placeholder": "なぜそうなったのか？", "type": "textarea", "required": false},
    {"id": "why2", "label": "なぜ？（2回目）", "icon": "❓", "placeholder": "その理由はなぜ？", "type": "textarea", "required": false},
    {"id": "why3", "label": "なぜ？（3回目）", "icon": "❓", "placeholder": "さらに深く、なぜ？", "type": "textarea", "required": false},
    {"id": "why4", "label": "なぜ？（4回目）", "icon": "❓", "placeholder": "本当の理由は？", "type": "textarea", "required": false},
    {"id": "why5", "label": "根本原因", "icon": "🔍", "placeholder": "最終的な原因は？", "type": "textarea", "required": false},
    {"id": "countermeasure", "label": "対策・改善策", "icon": "🛠️", "placeholder": "講じるべき対策や改善方法", "type": "textarea", "required": false}
  ]
}', '🔍', '#AB47BC', true, 12)

ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 確認クエリ
-- ========================================
-- 全フレームワークの確認
SELECT id, name, display_name, icon, color, sort_order
FROM frameworks
ORDER BY sort_order;

-- フレームワーク数の確認
SELECT COUNT(*) as total_frameworks FROM frameworks WHERE is_active = true;
