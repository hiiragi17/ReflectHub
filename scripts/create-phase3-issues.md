# Phase 3 実装タスク Issue 一覧

以下の Issue を GitHub 上で手動作成してください。`scripts/` ディレクトリの各テンプレートをコピペすることで簡単に作成できます。

---

## 📋 Issue 1: PWA機能実装（Day 1-2）

**タイトル**: `[Phase 3.1] PWA機能実装 - Web App Manifest, Service Worker, インストール UI`

**説明**:
```markdown
## 概要
ReflectHub を Progressive Web App（PWA）化し、ユーザーがインストール可能な状態にします。

## 実装内容
### Day 1-2: PWA基盤構築
- [ ] Web App Manifest ファイル作成 (`public/manifest.json`)
  - メタデータ、アイコン定義
  - スクリーンショット設定
- [ ] Service Worker 実装 (`public/sw.js`)
  - キャッシュ戦略（SWR: Stale-While-Revalidate）
  - アセット キャッシング
  - ネットワーク フォールバック
- [ ] Service Worker 登録スクリプト (`src/lib/sw/register.ts`)
- [ ] アイコン生成（192x192, 256x256, 384x384, 512x512）
- [ ] インストール プロンプト コンポーネント (`src/components/common/InstallPrompt.tsx`)
  - beforeinstallprompt イベント処理
  - ユーザーがインストール後のホーム画面追加
- [ ] インストール状態管理 Hook (`src/hooks/useInstallPrompt.ts`)

## 参考資料
- [設計書: PWA機能セクション](../PHASE3_DESIGN_DOCUMENT.md#31-pwa機能)
- [Web App Manifest - MDN](https://developer.mozilla.org/docs/Web/Manifest)
- [Service Worker - MDN](https://developer.mozilla.org/docs/Web/API/Service_Worker_API)

## チェックリスト
- [ ] すべての実装完了
- [ ] Web App がインストール可能
- [ ] Service Worker がアクティブに動作
- [ ] Lighthouse スコア PWA: 90以上
- [ ] テスト実装（Service Worker キャッシュテスト）
- [ ] コードレビュー完了

## ラベル
Phase 3, PWA, enhancement

## マイルストーン
Phase 3

## 関連 Issue
#39
```

---

## 📋 Issue 2: AI分析機能実装（Day 3-4）

**タイトル**: `[Phase 3.2] AI分析機能実装 - OpenAI API統合, 分析エンドポイント, UI`

**説明**:
```markdown
## 概要
OpenAI API を統合し、ユーザーの振り返り内容から自動的にインサイトを生成します。

## 実装内容
### Day 3-4: AI分析機能
- [ ] OpenAI API クライアント実装 (`src/lib/openai/client.ts`)
  - API キー管理（環境変数）
  - プロンプトテンプレート定義
- [ ] AI分析エンドポイント (`src/app/api/ai/analyze/route.ts`)
  - POST /api/ai/analyze
  - 認証検証
  - 入力値検証
  - OpenAI API 呼び出し
  - レート制限実装（1日3回）
  - 分析結果をDB保存
- [ ] AI分析ビジネスロジック (`src/services/aiAnalysisService.ts`)
  - 振り返りデータの変換
  - プロンプト生成
  - レスポンス解析
- [ ] 分析結果UI (`src/components/analysis/`)
  - AnalysisPanel.tsx - 分析結果表示パネル
  - InsightCard.tsx - インサイトカード
  - RecommendationList.tsx - 改善提案リスト
  - EmotionalTrend.tsx - 感情トレンド表示
- [ ] 分析カスタムフック (`src/hooks/useAIAnalysis.ts`)
- [ ] 型定義 (`src/types/analysis.ts`)
- [ ] エラーハンドリング強化
  - OpenAI API エラーの適切な処理
  - ユーザーフレンドリーなメッセージ
  - リトライロジック

## データモデル
```typescript
interface Analysis {
  id: string;
  user_id: string;
  reflection_id: string;
  growth_points: string[];
  improvement_suggestions: string[];
  emotional_trend: "positive" | "neutral" | "negative";
  key_achievements: string[];
  challenges: string[];
  recommendations: { actions: string[], focus_areas: string[] };
  metadata: { tokens_used: number, model: string, version: string };
  created_at: string;
  updated_at: string;
}
```

## 参考資料
- [設計書: AI分析機能セクション](../PHASE3_DESIGN_DOCUMENT.md#32-ai分析機能)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## チェックリスト
- [ ] OpenAI API 統合完了
- [ ] 分析エンドポイント実装完了
- [ ] UI 表示完了
- [ ] レート制限機能実装
- [ ] エラーハンドリング完了
- [ ] テスト実装（API テスト、モック OpenAI）
- [ ] コードレビュー完了

## ラベル
Phase 3, AI, OpenAI, enhancement

## マイルストーン
Phase 3

## 関連 Issue
#39
```

---

## 📋 Issue 3: 統計ダッシュボード実装（Day 5-6）

**タイトル**: `[Phase 3.3] 統計ダッシュボード実装 - KPI, チャート, アクティビティトレンド`

**説明**:
```markdown
## 概要
ユーザーの振り返り履歴から統計データを自動計算し、成長の可視化を提供します。

## 実装内容
### Day 5-6: 統計ダッシュボード
- [ ] 統計データ集計ロジック (`src/services/analyticsService.ts`)
  - 総振り返し数
  - 今月の振り返し数
  - 連続日数計算
  - 平均文字数
  - フレームワーク使用分布
- [ ] 統計API エンドポイント (`src/app/api/analytics/`)
  - GET /api/analytics/summary - KPI サマリー
  - GET /api/analytics/trends - トレンドデータ
  - GET /api/analytics/distribution - 分布データ
- [ ] Recharts ライブラリ統合
  - npm install recharts
- [ ] KPI カード コンポーネント (`src/components/analytics/StatsOverview.tsx`)
- [ ] グラフ・チャート実装 (`src/components/analytics/`)
  - ReflectionFrequency.tsx - Line Chart（頻度）
  - FrameworkDistribution.tsx - Pie Chart（フレームワーク分布）
  - EmotionalTrend.tsx - Bar Chart（感情トレンド）
  - ActivityHeatmap.tsx - Heatmap（GitHub スタイル）
  - GrowthTrendChart.tsx - Area Chart（3ヶ月成長）
- [ ] ダッシュボードページ (`src/app/analytics/page.tsx`)
  - レイアウト構成
  - グラフ配置
  - レスポンシブ対応
- [ ] カスタムフック (`src/hooks/useAnalytics.ts`)

## 参考資料
- [設計書: 統計ダッシュボード セクション](../PHASE3_DESIGN_DOCUMENT.md#33-統計ダッシュボード)
- [Recharts Documentation](https://recharts.org/)

## チェックリスト
- [ ] 統計集計ロジック完了
- [ ] API エンドポイント実装完了
- [ ] Recharts 統合完了
- [ ] 全チャート表示完了
- [ ] テスト実装（統計ロジック、チャート表示）
- [ ] レスポンシブ対応完了
- [ ] コードレビュー完了

## ラベル
Phase 3, Analytics, Charts, enhancement

## マイルストーン
Phase 3

## 関連 Issue
#39
```

---

## 📋 Issue 4: Web プッシュ通知 & セキュリティ・テスト（Day 7-14）

**タイトル**: `[Phase 3.4] Web プッシュ通知 & セキュリティ・テスト - 通知機能, CSRF対策, テスト体制`

**説明**:
```markdown
## 概要
Web Push API を活用した日次リマインダー機能を実装し、セキュリティ対策とテスト体制を完成させます。

## 実装内容
### Day 7: Web プッシュ通知 Phase 1
- [ ] Web Push API 統合 (`src/lib/push/client.ts`)
  - Service Worker での Push 受信
- [ ] 通知許可プロンプト UI (`src/components/common/PushNotificationPrompt.tsx`)
  - ユーザーが通知の許可/拒否を選択
- [ ] Push Subscription 管理 (`src/api/push/subscribe/route.ts`)
  - POST /api/push/subscribe
  - POST /api/push/unsubscribe

### Day 8-9: Web プッシュ通知 Phase 2
- [ ] リマインダー スケジューリング (`src/services/reminderService.ts`)
  - 日次リマインダー定時配信
- [ ] バックエンド Job 実装 (`src/jobs/dailyReminderJob.ts`)
  - Vercel Cron ジョブ設定
  - ユーザータイムゾーン対応
- [ ] リマインダー設定管理
  - GET /api/reminders/preferences
  - POST /api/reminders/preferences
  - ユーザーが時間・頻度を設定可能
- [ ] 通知ペイロード設計（日本語テキスト）

### Day 10-11: セキュリティ強化
- [ ] CSRF対策実装
  - X-CSRF-Token ヘッダー生成 (`src/hooks/useCSRFToken.ts`)
  - サーバー側検証 (`src/utils/csrfToken.ts`)
  - Middleware 統合 (`src/middleware.ts`)
- [ ] 入力検証強化 (`src/utils/validation.ts`)
  - JSONスキーマ検証（zod/yup）
  - URLバリデーション（許可リスト方式）
  - サニタイゼーション強化
- [ ] OpenAI プロンプトインジェクション対策
  - プロンプト入力値のバリデーション
  - 危険な記号フィルタリング

### Day 12-13: テスト・セキュリティ
- [ ] Web プッシュテスト (`test/push/`)
  - Web Push API 統合テスト
  - リマインダー送信テスト
  - 通知 UI テスト
- [ ] AI分析テスト (`test/services/aiAnalysisService.test.ts`)
  - OpenAI API モック
  - 分析ロジック検証
  - レート制限検証
- [ ] 統計機能テスト (`test/services/analyticsService.test.ts`)
  - KPI 計算検証
  - トレンドデータ生成検証
- [ ] セキュリティテスト
  - CSRF トークン検証
  - XSS 対策検証
  - SQLインジェクション対策確認
- [ ] テストカバレッジ 80%以上達成

### Day 14: 本番準備・リリース
- [ ] Core Web Vitals 最適化
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- [ ] パフォーマンステスト
- [ ] セキュリティレビュー完了
- [ ] ドキュメント完成
- [ ] 本番環境デプロイ

## テーブル設計
```typescript
interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserPreferences {
  user_id: string;
  pwa_install_dismissed: boolean;
  push_notifications_enabled: boolean;
  reminder_time: string;
  reminder_frequency: "daily" | "weekdays";
  timezone: string;
  created_at: string;
  updated_at: string;
}
```

## 参考資料
- [設計書: Web プッシュ通知機能](../PHASE3_DESIGN_DOCUMENT.md#34-webプッシュ通知機能)
- [設計書: セキュリティ設計](../PHASE3_DESIGN_DOCUMENT.md#7-セキュリティ設計)
- [Web Push API - MDN](https://developer.mozilla.org/docs/Web/API/Push_API)

## チェックリスト
- [ ] Web Push API 統合完了
- [ ] リマインダー送信機能完了
- [ ] 通知設定管理完了
- [ ] CSRF対策実装完了
- [ ] 入力検証強化完了
- [ ] テストカバレッジ 80%以上達成
- [ ] セキュリティレビュー完了
- [ ] Core Web Vitals 達成
- [ ] 本番環境デプロイ完了

## ラベル
Phase 3, Push Notification, Security, Testing, enhancement

## マイルストーン
Phase 3

## 関連 Issue
#39
```

---

## 🚀 Issue 作成方法

### 方法 1: GitHub UI から手動作成（推奨）

1. GitHub リポジトリ https://github.com/hiiragi17/ReflectHub に移動
2. **Issues** タブをクリック
3. **New issue** をクリック
4. **Choose an issue template** から **Phase 3 実装タスク** を選択
5. 上記の各テンプレートの内容をコピペして、Issue を作成

### 方法 2: 直接リンクから作成

https://github.com/hiiragi17/ReflectHub/issues/new?template=phase3-implementation.md

---

## 📊 進捗追跡

| Issue | ステータス | 優先度 | 期日 |
|------|----------|--------|------|
| Phase 3.1: PWA機能 | TODO | P0 | Day 2 |
| Phase 3.2: AI分析 | TODO | P0 | Day 4 |
| Phase 3.3: 統計ダッシュボード | TODO | P0 | Day 6 |
| Phase 3.4: Web Push + Security + Tests | TODO | P0 | Day 14 |

---

## 参考リンク

- [PHASE3_DESIGN_DOCUMENT.md](../PHASE3_DESIGN_DOCUMENT.md)
- [PHASE2_DESIGN_DOCUMENT.md](../PHASE2_DESIGN_DOCUMENT.md)
- [Issue #39 Phase 3 実装計画](https://github.com/hiiragi17/ReflectHub/issues/39)
