# Phase 3 実装タスク Issue 一覧

以下の Issue を GitHub 上で手動作成してください。`scripts/` ディレクトリの各テンプレートをコピペすることで簡単に作成できます。

---

## 📋 Issue 1: PWA機能実装（Day 1-4）

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
  - ショートカット定義
- [ ] Service Worker 実装 (`public/sw.js`)
  - キャッシュ戦略（SWR: Stale-While-Revalidate）
  - アセット キャッシング
  - ネットワーク フォールバック
- [ ] Service Worker 登録スクリプト (`src/lib/sw/register.ts`)
- [ ] アイコン生成（192x192, 256x256, 384x384, 512x512）

### Day 3-4: インストール UI
- [ ] インストール プロンプト コンポーネント (`src/components/common/InstallPrompt.tsx`)
  - beforeinstallprompt イベント処理
  - ユーザーがインストール後のホーム画面追加
- [ ] インストール状態管理 Hook (`src/hooks/useInstallPrompt.ts`)
- [ ] ヘッダーにインストールボタン表示

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

## 📋 Issue 2: AI分析機能実装（Day 5-9）

**タイトル**: `[Phase 3.2] AI分析機能実装 - OpenAI API統合, 分析エンドポイント, UI`

**説明**:
```markdown
## 概要
OpenAI API を統合し、ユーザーの振り返り内容から自動的にインサイトを生成します。

## 実装内容
### Day 5-7: AI分析機能 Phase 1
- [ ] OpenAI API クライアント実装 (`src/lib/openai/client.ts`)
  - API キー管理（環境変数）
  - プロンプトテンプレート定義
- [ ] AI分析エンドポイント (`src/app/api/ai/analyze/route.ts`)
  - POST /api/ai/analyze
  - 認証検証
  - 入力値検証
  - OpenAI API 呼び出し
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

### Day 8-9: AI分析機能 Phase 2
- [ ] レート制限実装 (1ユーザー/1日3回)
  - Supabase でレート制限追跡
  - API エンドポイントで検証
- [ ] エラーハンドリング強化
  - OpenAI API エラーの適切な処理
  - ユーザーフレンドリーなメッセージ
  - リトライロジック
- [ ] キャッシング機構
  - 分析結果のキャッシング
  - 前回の分析との比較表示
- [ ] プロンプトインジェクション対策
  - 入力値のサニタイゼーション
  - 危険な記号削除

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
#39, Phase 3.1
```

---

## 📋 Issue 3: 統計ダッシュボード実装（Day 5-14）

**タイトル**: `[Phase 3.3] 統計ダッシュボード実装 - KPI, チャート, アクティビティトレンド`

**説明**:
```markdown
## 概要
ユーザーの振り返り履歴から統計データを自動計算し、成長の可視化を提供します。

## 実装内容
### Day 5-7: 統計ダッシュボード Phase 1
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
  - 総振り返し数表示
  - 今月の振り返し数
  - 連続日数
  - 平均文字数

### Day 10-11: 統計ダッシュボード Phase 2
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
  - データ取得とキャッシング

### Day 12-14: 統計ダッシュボード Phase 3
- [ ] フィルター機能
  - 日付範囲選択
  - フレームワーク フィルター
  - 感情スコア フィルター
- [ ] エクスポート機能（オプション）
  - CSV, PDF エクスポート
- [ ] ゲーミフィケーション要素
  - バッジ・アチーブメント表示
  - マイルストーン表示

## 参考資料
- [設計書: 統計ダッシュボード セクション](../PHASE3_DESIGN_DOCUMENT.md#33-統計ダッシュボード)
- [Recharts Documentation](https://recharts.org/)

## チェックリスト
- [ ] 統計集計ロジック完了
- [ ] API エンドポイント実装完了
- [ ] Recharts 統合完了
- [ ] 全チャート表示完了
- [ ] フィルター機能実装（オプション）
- [ ] テスト実装（統計ロジック、チャート表示）
- [ ] コードレビュー完了

## ラベル
Phase 3, Analytics, Charts, enhancement

## マイルストーン
Phase 3

## 関連 Issue
#39, Phase 3.1, Phase 3.2
```

---

## 📋 Issue 4: セキュリティ強化・テスト実装（Day 12-18）

**タイトル**: `[Phase 3.4] セキュリティ強化・テスト実装 - CSRF対策, 入力検証, テスト体制確立`

**説明**:
```markdown
## 概要
本番環境への対応として、セキュリティ強化とテスト体制を確立します。

## 実装内容
### Day 12: オフライン機能実装
- [ ] IndexedDB スキーマ実装 (`src/lib/indexeddb/draftStore.ts`)
  - オフライン振り返りドラフト保存
- [ ] オフライン同期ロジック (`src/hooks/useOfflineSync.ts`)
  - ネットワーク復帰時の自動同期
  - 同期エラーハンドリング

### Day 15-16: セキュリティ強化
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
  - システムプロンプト埋め込み防止
- [ ] セキュリティヘッダー設定 (`next.config.js`)
  - Strict-Transport-Security
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
  - Content-Security-Policy

### Day 17-18: テスト実装
- [ ] AI分析テスト (`test/services/aiAnalysisService.test.ts`)
  - OpenAI API モック
  - 分析ロジック検証
  - エラーハンドリング
  - レート制限検証
- [ ] 統計機能テスト (`test/services/analyticsService.test.ts`)
  - KPI 計算検証
  - トレンドデータ生成検証
- [ ] PWA テスト (`test/pwa/serviceWorker.test.ts`)
  - Service Worker キャッシング
  - オフライン動作
- [ ] セキュリティテスト
  - CSRF トークン検証
  - XSS 対策検証
  - SQLインジェクション対策確認
- [ ] E2E テスト基本実装（Playwright）
  - 振り返り作成 → AI分析 → アナリティクス表示フロー
- [ ] テストカバレッジ測定
  - 目標: 80%以上

## 参考資料
- [設計書: セキュリティ設計](../PHASE3_DESIGN_DOCUMENT.md#7-セキュリティ設計)
- [設計書: テスト戦略](../PHASE3_DESIGN_DOCUMENT.md#8-テスト戦略)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## チェックリスト
- [ ] CSRF対策実装完了
- [ ] 入力検証強化完了
- [ ] セキュリティヘッダー設定完了
- [ ] ユニットテスト実装完了
- [ ] E2E テスト基本実装完了
- [ ] テストカバレッジ 80%以上達成
- [ ] セキュリティレビュー完了
- [ ] コードレビュー完了

## ラベル
Phase 3, Security, Testing, enhancement

## マイルストーン
Phase 3

## 関連 Issue
#39, Phase 3.1, Phase 3.2, Phase 3.3
```

---

## 📋 Issue 5: 本番準備・リリース（Day 19-21）

**タイトル**: `[Phase 3.5] 本番準備・リリース - パフォーマンス最適化, デプロイメント, リリース`

**説明**:
```markdown
## 概要
本番環境への移行準備を整え、最適化とリリースを完了します。

## 実装内容
### Day 19-20: 本番準備・最適化
- [ ] Core Web Vitals 最適化
  - Lighthouse スコア 90以上を目指す
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
  - INP < 200ms
- [ ] 画像最適化 (`next.config.js`)
  - WebP/AVIF フォーマット対応
  - 動的イメージサイジング
- [ ] Code Splitting・バンドルサイズ削減
  - 動的インポート実装
  - Tree shaking 最適化
  - メインバンドル < 200KB (gzipped)
- [ ] キャッシング戦略設定
  - ISR (Incremental Static Regeneration)
  - SWR (Stale-While-Revalidate)
  - CDN キャッシュ設定
- [ ] データベースクエリ最適化
  - インデックス設計
  - N+1 クエリ問題対処
- [ ] ドメイン・SSL設定
  - Custom domain 設定
  - SSL 証明書確認（自動）
- [ ] 環境変数設定 (Vercel)
  - OPENAI_API_KEY
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - その他本番用変数
- [ ] モニタリング・ロギング設定
  - Vercel Analytics 設定
  - Sentry 統合（Future）
  - エラーログ送信エンドポイント

### Day 21: リリース実行
- [ ] 本番環境ステージング
  - Vercel Preview Deployment
  - スモークテスト実行
- [ ] Canary Release 実行
  - 10% → 50% → 100% の段階的ロールアウト
  - 1時間ごとにメトリクス確認
- [ ] ヘルスチェック実装
  - GET /api/health エンドポイント実装
- [ ] 運用ハンドオーバー
  - ドキュメント完備
  - サポートテンプレート準備
  - 本番 SLA 確認

## チェックリスト
- [ ] 本番環境チェックリスト完了
  - [ ] All tests passing
  - [ ] Lighthouse score >= 90
  - [ ] No console errors/warnings
  - [ ] HTTPS working
  - [ ] Security headers present
  - [ ] Environment variables set
  - [ ] Database backups configured
  - [ ] Error monitoring enabled
  - [ ] CDN cache configured
  - [ ] Rate limiting active
- [ ] Core Web Vitals 達成
- [ ] パフォーマンステスト完了
- [ ] ドキュメント完成
- [ ] Canary Release 成功
- [ ] 本番リリース完了

## 参考資料
- [設計書: パフォーマンス最適化](../PHASE3_DESIGN_DOCUMENT.md#9-パフォーマンス最適化)
- [設計書: デプロイメント・ロールアウト](../PHASE3_DESIGN_DOCUMENT.md#10-デプロイメントロールアウト)

## ラベル
Phase 3, Production, Deployment, enhancement

## マイルストーン
Phase 3

## 関連 Issue
#39, Phase 3.1, Phase 3.2, Phase 3.3, Phase 3.4
```

---

## 🚀 Issue 作成方法

### 方法 1: GitHub UI から手動作成（推奨）

1. GitHub リポジトリ https://github.com/hiiragi17/ReflectHub に移動
2. **Issues** タブをクリック
3. **New issue** をクリック
4. **Choose an issue template** から **Phase 3 実装タスク** を選択
5. 上記の各テンプレートの内容をコピペして、Issue を作成

### 方法 2: CLI から一括作成（Future）

```bash
# 例: curl + GitHub API
curl -X POST https://api.github.com/repos/hiiragi17/ReflectHub/issues \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d @issue-payload.json
```

---

## 📊 進捗追跡

| Issue | ステータス | 優先度 | 期日 |
|------|----------|--------|------|
| Phase 3.1: PWA機能 | TODO | P0 | Day 4 |
| Phase 3.2: AI分析 | TODO | P0 | Day 9 |
| Phase 3.3: 統計ダッシュボード | TODO | P0 | Day 14 |
| Phase 3.4: セキュリティ・テスト | TODO | P0 | Day 18 |
| Phase 3.5: 本番準備・リリース | TODO | P0 | Day 21 |

---

## 参考リンク

- [PHASE3_DESIGN_DOCUMENT.md](../PHASE3_DESIGN_DOCUMENT.md)
- [Issue #39 Phase 3 実装計画](https://github.com/hiiragi17/ReflectHub/issues/39)
