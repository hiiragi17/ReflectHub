# Phase 2 実装タスク Issue 一覧

以下の Issue を GitHub 上で手動作成してください。`scripts/` ディレクトリの各テンプレートをコピペすることで簡単に作成できます。

---

## 📋 Issue 1: フレームワーク管理の強化（Day 1-2）

**タイトル**: `[Phase 2.1] フレームワーク管理の強化 - 複数フレームワーク対応, カスタムフレームワーク`

**説明**:
```markdown
## 概要
YWT・KPT に加え、4L、STAR などの複数フレームワークに対応し、ユーザーがカスタムフレームワークを作成・管理できる機能を実装します。

## 実装内容
### Day 1-2: フレームワーク管理の強化

#### データモデル拡張
- [ ] `frameworks` テーブル拡張
  - `created_by`: ユーザーによるカスタムフレームワーク作成者
  - `is_public`: 他ユーザーと共有可能か
  - `usage_count`: 使用回数統計
  - `last_used`: 最終使用日時
- [ ] `user_frameworks` テーブル新規作成
  - ユーザーごとのフレームワーク選好設定

#### 新規フレームワークの実装
- [ ] **4L フレームワーク**
  - Liked（好きだったこと）
  - Learned（学んだこと）
  - Lacked（欠けていたこと）
  - Longed for（今後期待すること）
- [ ] **STAR フレームワーク**
  - Situation（状況）
  - Task（課題）
  - Action（行動）
  - Result（結果）
- [ ] **振り返り日記**
  - 時間軸に沿った自由記述形式

#### フレームワーク管理 UI
- [ ] フレームワーク選択画面の拡張 (`src/components/reflection/FrameworkSelector.tsx`)
  - フレームワークグリッド表示
  - 説明・プレビュー表示
  - お気に入り機能
- [ ] フレームワーク管理ページ (`src/app/settings/frameworks/page.tsx`)
  - フレームワーク一覧表示
  - カスタムフレームワーク作成・編集
  - 削除機能
- [ ] フレームワークビルダー (`src/components/frameworks/FrameworkBuilder.tsx`)
  - フィールド動的追加・削除
  - フィールド設定（ラベル、プレースホルダー、必須、最大長など）
  - プレビュー機能
  - 保存・キャンセル

#### API エンドポイント
- [ ] `GET /api/frameworks` - フレームワーク一覧取得
- [ ] `GET /api/frameworks/:id` - フレームワーク詳細取得
- [ ] `POST /api/frameworks` - カスタムフレームワーク作成
- [ ] `PUT /api/frameworks/:id` - フレームワーク更新
- [ ] `DELETE /api/frameworks/:id` - フレームワーク削除（カスタムのみ）

#### ビジネスロジック拡張
- [ ] `src/services/frameworkService.ts` 拡張
  - フレームワーク CRUD ロジック
  - カスタムフレームワーク検証
  - デフォルトフレームワークのバージョン管理

## テスト
- [ ] フレームワーク作成・編集・削除テスト
- [ ] フレームワーク選択・切り替えテスト
- [ ] カスタムフレームワーク検証テスト

## 参考資料
- [設計書: フレームワーク管理の強化](../PHASE2_DESIGN_DOCUMENT.md#31-複数フレームワーク管理の強化)

## チェックリスト
- [ ] 全新規フレームワーク実装完了
- [ ] カスタムフレームワーク作成機能完了
- [ ] フレームワーク管理 UI 完成
- [ ] API エンドポイント実装完了
- [ ] テスト実施（70%以上カバレッジ）
- [ ] コードレビュー完了

## ラベル
Phase 2, Framework, enhancement

## マイルストーン
Phase 2

## 関連 Issue
TBD (Phase 2 メタ)
```

---

## 📋 Issue 2: 統計・トレンド分析（Day 3-5）

**タイトル**: `[Phase 2.2] 統計・トレンド分析実装 - KPI, グラフ, 成長スコア`

**説明**:
```markdown
## 概要
振り返り履歴から統計データを自動計算し、ユーザーの成長を可視化します。

## 実装内容
### Day 3-5: 統計・トレンド分析

#### 統計計算ロジック
- [ ] `src/services/analyticsService.ts` 実装
  - **基本統計**: 総数、今月数、連続日数、平均文字数
  - **頻度分析**: 週ごと・月ごとの振り返し数
  - **フレームワーク分析**: 使用フレームワークの分布
  - **期間比較**: 前月比・前週比
  - **ストリーク計算**: 連続日数、ベストストリーク
  - **成長スコア**: 複合指標（0-100）

#### API エンドポイント
- [ ] `GET /api/analytics/summary` - KPI サマリー取得
- [ ] `GET /api/analytics/trends` - トレンドデータ取得（週次・月次）
- [ ] `GET /api/analytics/distribution` - 分布データ取得

#### ダッシュボード UI
- [ ] `src/app/analytics/page.tsx` - 統計ダッシュボード
- [ ] `src/components/statistics/`
  - **StatsCard.tsx** - KPI カード表示（総数、今月、連続日数、平均文字数）
  - **TrendChart.tsx** - トレンドチャート（Line Chart）
  - **FrameworkBreakdown.tsx** - フレームワーク分布（Pie Chart）
  - **PeriodComparison.tsx** - 期間比較表示
  - **StreakDisplay.tsx** - ストリーク表示
  - **GrowthScore.tsx** - 成長スコア表示（0-100）

#### グラフ・チャートライブラリ
- [ ] Recharts ライブラリ導入
  - `npm install recharts`
  - Chart.js または他代替ライブラリ検討

#### カスタムフック
- [ ] `src/hooks/useStatistics.ts` - 統計データ取得・キャッシング

## 参考資料
- [設計書: 統計・トレンド分析](../PHASE2_DESIGN_DOCUMENT.md#32-高度な統計トレンド分析)
- [Recharts Documentation](https://recharts.org/)

## テスト
- [ ] 統計計算ロジックテスト
- [ ] API エンドポイントテスト
- [ ] グラフレンダリングテスト

## チェックリスト
- [ ] 統計計算ロジック完了
- [ ] API エンドポイント実装完了
- [ ] ダッシュボード UI 完成
- [ ] グラフ・チャート表示確認
- [ ] テスト実施（70%以上カバレッジ）
- [ ] コードレビュー完了

## ラベル
Phase 2, Analytics, Statistics, enhancement

## マイルストーン
Phase 2

## 関連 Issue
TBD (Phase 2 メタ)
```

---

## 📋 Issue 3: UI/UX 改善（Day 6-8）

**タイトル**: `[Phase 2.3] UI/UX 改善 - レスポンシブ強化, アニメーション, アクセシビリティ`

**説明**:
```markdown
## 概要
Phase 1 の UI を改善し、より直感的で美しいインターフェースを実現します。

## 実装内容
### Day 6-8: UI/UX 改善

#### レスポンシブ対応強化
- [ ] タブレット向けレイアウト最適化
  - 2カラムレイアウト実装
  - サイドバー + メインコンテンツ
- [ ] デスクトップ向けレイアウト
  - 3カラムレイアウト（ナビゲーション + メイン + サイドパネル）
  - ウィジェット配置の柔軟化
- [ ] `src/components/layout/ResponsiveGrid.tsx` 実装
- [ ] `src/components/layout/SidebarLayout.tsx` 実装
- [ ] `src/hooks/useMediaQuery.ts` 実装（メディアクエリ Hook）

#### アニメーション実装
- [ ] ページ遷移アニメーション
- [ ] ローディング状態アニメーション
- [ ] ボタンホバーエフェクト
- [ ] リスト表示アニメーション（フェードイン）
- [ ] `src/components/animations/FadeIn.tsx`
- [ ] `src/components/animations/SlideIn.tsx`
- [ ] `src/components/animations/SkeletonLoader.tsx`
- [ ] CSS animations: `src/styles/animations.css`

#### アクセシビリティ改善
- [ ] WCAG 2.1 AA 準拠確認
  - キーボードナビゲーション対応
  - スクリーンリーダー対応
  - 色コントラスト確認（4.5:1 以上）
- [ ] ARIA 属性適切な配置
- [ ] セマンティック HTML 確認
- [ ] フォーカス管理

#### ローディング状態
- [ ] `src/components/common/Loading.tsx` - 統一ローディング UI
- [ ] スケルトンコンポーネントの活用
- [ ] Suspense による遅延ローディング

#### フォント・タイポグラフィ
- [ ] 日本語フォント最適化
  - `src/styles/typography.css`
- [ ] フォントサイズ・行間の最適化
- [ ] ダーク背景での可読性確保

## 参考資料
- [設計書: UI/UX 改善](../PHASE2_DESIGN_DOCUMENT.md#33-uiux改善)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## テスト
- [ ] レスポンシブテスト（各デバイスサイズ）
- [ ] アニメーション表示確認
- [ ] アクセシビリティテスト
- [ ] Lighthouse スコア確認

## チェックリスト
- [ ] レスポンシブ対応完了
- [ ] アニメーション実装完了
- [ ] アクセシビリティ改善完了
- [ ] 全デバイスでの表示確認
- [ ] Lighthouse score >= 85
- [ ] コードレビュー完了

## ラベル
Phase 2, UI, UX, enhancement

## マイルストーン
Phase 2

## 関連 Issue
TBD (Phase 2 メタ)
```

---

## 📋 Issue 4: エラーハンドリング強化（Day 9-10）

**タイトル**: `[Phase 2.4] エラーハンドリング強化 - エラーログ, 監視機構, 自動回復`

**説明**:
```markdown
## 概要
Phase 1 で実装した基本的なエラーハンドリングを強化し、エラーログの記録・分析機構を構築します。

## 実装内容
### Day 9-10: エラーハンドリング強化

#### エラーログ記録システム
- [ ] **error_logs テーブル設計**
  - `src/types/errorTracking.ts` - 型定義
  - ユーザーID、エラータイプ、メッセージ、スタックトレース
  - エラーコンテキスト（ページ、アクション、タイムスタンプ）
  - 解決フラグ・解決方法

- [ ] **フロントエンド エラー追跡** (`src/lib/errorTracking/client.ts`)
  - エラーキャプチャ
  - コンテキスト自動収集
  - バッチ送信ロジック

- [ ] **バックエンド エラーログ API**
  - `POST /api/logs/errors` - エラーログ受信
  - `GET /api/logs/errors?user_id=:id` - エラーログ一覧取得（管理者用）

- [ ] **エラーログサービス** (`src/services/errorLoggingService.ts`)
  - ログ送信ロジック
  - レート制限（同一エラーの過度な送信防止）
  - ローカルストレージバックアップ

#### エラー集計・分析
- [ ] **error_metrics テーブル設計**
  - 日ごとのエラー集計
  - エラータイプ別集計
  - 解決率計算

#### 自動回復機構の強化
- [ ] リトライロジック改善（既実装）
  - 指数バックオフ: 1s → 2s → 4s
  - 最大3回リトライ

- [ ] ネットワークエラー自動回復
  - オフライン検出
  - 接続復帰時の自動リトライ
  - `src/hooks/useNetworkStatus.ts` 活用

- [ ] Graceful degradation
  - サービス利用不可時のフォールバック UI
  - ユーザーへの明確な説明

#### エラーメッセージの改善
- [ ] ユーザーフレンドリーなメッセージ
  - 技術的なエラーメッセージを隠蔽
  - 対応アクション提示
- [ ] エラーメッセージのローカライズ（日本語）
- [ ] `src/utils/errorHandler.ts` 拡張

#### 監視ダッシュボード（管理者用・Future）
- [ ] エラー統計表示（日ごと、エラータイプ別）
- [ ] 解決率トレンド
- [ ] アラート設定（高エラー率時）

## 参考資料
- [設計書: エラーハンドリング・監視](../PHASE2_DESIGN_DOCUMENT.md#34-エラーハンドリング監視)

## テスト
- [ ] エラーログ記録テスト
- [ ] エラー送信 API テスト
- [ ] 自動回復ロジックテスト
- [ ] ネットワークエラーシミュレーション

## チェックリスト
- [ ] エラーログテーブル実装完了
- [ ] フロントエンド エラー追跡実装
- [ ] エラーログ API 実装完了
- [ ] 自動回復機構テスト確認
- [ ] エラーメッセージ改善完了
- [ ] テスト実施（70%以上カバレッジ）
- [ ] コードレビュー完了

## ラベル
Phase 2, Error Handling, Logging, enhancement

## マイルストーン
Phase 2

## 関連 Issue
TBD (Phase 2 メタ)
```

---

## 📋 Issue 5: Web プッシュ基盤 & テスト体制確立（Day 11-16）

**タイトル**: `[Phase 2.5] Web プッシュ基盤構築 & テスト体制確立 - データモデル, テストカバレッジ`

**説明**:
```markdown
## 概要
Phase 3 での Web プッシュ通知実装に向け、基盤となるテーブル設計と API 仕様を先行実装します。同時にテスト体制を確立し、テストカバレッジ 70%以上を達成します。

## 実装内容
### Day 11-12: Web プッシュ基盤構築

#### Push Subscriptions テーブル設計
- [ ] `src/types/push.ts` - 型定義
- [ ] データベーステーブル作成
  - `id`, `user_id`, `endpoint`, `p256dh`, `auth`
  - `user_agent`, `browser`, `is_active`
  - `created_at`, `updated_at`
- [ ] RLS ポリシー設定
  - ユーザーは自分の Subscription のみアクセス可能

#### User Preferences テーブル拡張
- [ ] `user_preferences` テーブル設計（Phase 3 用）
  - `pwa_install_dismissed`: インストール案内の非表示フラグ
  - `timezone`: タイムゾーン
  - `notification_preferences`: JSON フィールド
    - `push_enabled`, `reminder_time`, `reminder_frequency`

#### Push API エンドポイント設計
- [ ] `POST /api/push/subscribe` - Push Subscription 登録
- [ ] `POST /api/push/unsubscribe` - Push Subscription 削除
- [ ] `GET /api/preferences` - ユーザー設定取得
- [ ] `PUT /api/preferences` - ユーザー設定更新

#### セキュリティ対応
- [ ] Subscription Endpoint 暗号化
  - `src/lib/push/encryption.ts` - 暗号化・復号化
- [ ] 認証検証（セッション確認）

### Day 13-15: テスト体制確立

#### ユニットテスト拡張
- [ ] フレームワークサービス テスト
  - フレームワーク CRUD テスト
  - バリデーション テスト
- [ ] 統計サービス テスト
  - KPI 計算テスト
  - トレンドデータ生成テスト
- [ ] エラーハンドリング テスト
  - エラーログ記録テスト
  - 自動回復ロジック テスト
- [ ] UI コンポーネント テスト
  - フレームワークビルダー テスト
  - 統計ダッシュボード テスト

#### 統合テスト
- [ ] API エンドポイント統合テスト
  - `/api/frameworks/*` テスト
  - `/api/analytics/*` テスト
  - `/api/preferences` テスト
- [ ] Supabase 統合テスト
  - トランザクション テスト
  - RLS ポリシー テスト

#### テストカバレッジ測定
- [ ] Vitest + Istanbul で測定
- [ ] 目標: 70%以上
- [ ] `npm run test:coverage`

#### テスト自動化
- [ ] Pre-commit Hook に テスト追加
- [ ] CI/CD パイプラインにテスト組み込み

### Day 16: テスト完了・本番準備

#### テスト結果レビュー
- [ ] カバレッジ 70%以上確認
- [ ] 失敗テスト修正
- [ ] パフォーマンステスト

#### ドキュメント更新
- [ ] テスト実行方法ドキュメント
- [ ] 開発環境セットアップガイド

## テスト構成
```
test/
├── services/
│   ├── frameworkService.test.ts
│   ├── analyticsService.test.ts
│   └── errorLoggingService.test.ts
├── api/
│   ├── frameworks.test.ts
│   ├── analytics.test.ts
│   ├── preferences.test.ts
│   └── logs.test.ts
├── components/
│   ├── FrameworkBuilder.test.tsx
│   └── StatsDashboard.test.tsx
└── utils/
    └── errorHandler.test.ts
```

## 参考資料
- [設計書: Web プッシュ通知基盤](../PHASE2_DESIGN_DOCUMENT.md#35-webプッシュ通知基盤preview)
- [Vitest Documentation](https://vitest.dev/)
- [Web Crypto API - MDN](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API)

## チェックリスト
- [ ] Push Subscriptions テーブル実装
- [ ] User Preferences テーブル実装
- [ ] Push API エンドポイント設計完了
- [ ] 暗号化ロジック実装
- [ ] ユニットテスト実装（70%以上カバレッジ）
- [ ] 統合テスト実装
- [ ] 全テスト通過確認
- [ ] ドキュメント完成
- [ ] コードレビュー完了

## ラベル
Phase 2, Push Notification, Testing, enhancement

## マイルストーン
Phase 2

## 関連 Issue
TBD (Phase 2 メタ)
```

---

## 🚀 Issue 作成方法

### 方法 1: GitHub UI から手動作成（推奨）

1. GitHub リポジトリ https://github.com/hiiragi17/ReflectHub に移動
2. **Issues** タブをクリック
3. **New issue** をクリック
4. **Choose an issue template** から **Phase 2 実装タスク** を選択
5. 上記の各テンプレートの内容をコピペして、Issue を作成

### 方法 2: 直接リンクから作成

https://github.com/hiiragi17/ReflectHub/issues/new?template=phase2-implementation.md

---

## 📊 進捗追跡

| Issue | ステータス | 優先度 | 期日 |
|------|----------|--------|------|
| Phase 2.1: フレームワーク管理強化 | TODO | P0 | Day 2 |
| Phase 2.2: 統計・トレンド分析 | TODO | P0 | Day 5 |
| Phase 2.3: UI/UX 改善 | TODO | P0 | Day 8 |
| Phase 2.4: エラーハンドリング強化 | TODO | P0 | Day 10 |
| Phase 2.5: Web プッシュ基盤 & テスト | TODO | P0 | Day 16 |

---

## 参考リンク

- [PHASE2_DESIGN_DOCUMENT.md](../PHASE2_DESIGN_DOCUMENT.md)
- [PHASE3_DESIGN_DOCUMENT.md](../PHASE3_DESIGN_DOCUMENT.md)
