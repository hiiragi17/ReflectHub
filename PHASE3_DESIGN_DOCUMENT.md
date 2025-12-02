# ReflectHub Phase 3 詳細設計書

## ドキュメント情報

| 項目 | 内容 |
|-----|-----|
| **ドキュメント名** | ReflectHub Phase 3 詳細設計書 |
| **バージョン** | 2.0（修正版） |
| **作成日** | 2025-11-18 |
| **更新日** | 2025-11-18 |
| **ステータス** | Draft |
| **対応するIssue** | #39 |
| **期間** | Phase 3（14日間実装計画） |

### 修正履歴
- **v1.0 → v2.0**: LINE連携関連を削除、Web プッシュ通知を追加（PWA統合）

---

## 目次

1. [概要・目的](#1-概要目的)
2. [設計方針・原則](#2-設計方針原則)
3. [各機能の詳細設計](#3-各機能の詳細設計)
   - [3.1 PWA機能](#31-pwa機能)
   - [3.2 AI分析機能](#32-ai分析機能)
   - [3.3 統計ダッシュボード](#33-統計ダッシュボード)
   - [3.4 Web プッシュ通知機能](#34-webプッシュ通知機能)
4. [技術スタック・構成](#4-技術スタック構成)
5. [API設計](#5-api設計)
6. [データモデル拡張](#6-データモデル拡張)
7. [セキュリティ設計](#7-セキュリティ設計)
8. [テスト戦略](#8-テスト戦略)
9. [パフォーマンス・最適化](#9-パフォーマンス最適化)
10. [デプロイメント・ロールアウト](#10-デプロイメントロールアウト)
11. [実装スケジュール](#11-実装スケジュール)
12. [リスク管理](#12-リスク管理)

---

## 1. 概要・目的

### 1.1 Phase 3 の目標

ReflectHub は現在、基本的な振り返り記録・管理機能が実装されています。Phase 3 では以下の領域を拡張し、ユーザーに対してより高い価値を提供することを目的とします。

| 領域 | 目標 | 完成状態 |
|-----|------|--------|
| **PWA化** | オフライン対応・インストール可能 | Web AppとしてのInstallation ready |
| **AI分析** | 振り返りの自動分析・インサイト生成 | OpenAI API統合、分析レポート表示 |
| **統計ダッシュボード** | ユーザーの成長を可視化 | グラフ・チャート・トレンド表示 |
| **プッシュ通知** | 日次リマインダー配信 | Web Push で振り返り促進 |
| **セキュリティ強化** | 本番環境への耐性確保 | CSRF対策、入力検証強化、監視機構 |
| **テスト体制確立** | 品質保証・回帰テスト | Unit・Integration・E2E テストの実装 |
| **本番デプロイ** | Vercel上での安定稼働 | ヘルスチェック、エラー監視、ホットスタンバイ |

### 1.2 ステークホルダー・対象ユーザー

- **Primary User**: 日本の若手ビジネスパーソン（25-40代）
- **Use Case**: 日々の振り返り、自己成長の記録・分析、リマインダー受信
- **環境**: スマートフォン・タブレット・PCでのアクセス

### 1.3 成功指標

| KPI | 目標値 | 測定方法 |
|-----|--------|--------|
| **Lighthouse スコア** | 90以上 | Vercel Analytics |
| **ページ遷移速度** | < 2秒 | Core Web Vitals |
| **テストカバレッジ** | > 80% | Vitest + Istanbul |
| **API応答時間** | < 500ms | APM（Application Performance Monitoring） |
| **可用性** | 99.5%以上 | 監視ダッシュボード |
| **PWA インストール率** | > 30% | Vercel Analytics |

---

## 2. 設計方針・原則

### 2.1 アーキテクチャ設計方針

```
┌─────────────────────────────────────────────────────┐
│                    Presentation Layer                │
│  (React Components + Tailwind + shadcn/ui)          │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│               Business Logic Layer                   │
│  (Hooks + Services + React Query)                   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│              Data Access Layer                       │
│  (Supabase SDK + API Routes)                        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│            Infrastructure Layer                      │
│  (Supabase DB + OpenAI API + Web Push + Vercel)    │
└─────────────────────────────────────────────────────┘
```

### 2.2 設計原則

1. **モジュール性**: 各機能は独立したモジュールとして設計
2. **再利用性**: コンポーネント・フックの最大化
3. **テスト容易性**: 依存性注入、モック化が容易な設計
4. **スケーラビリティ**: 将来のユーザー増加に対応可能な設計
5. **セキュリティ優先**: OWASP Top 10を念頭に設計
6. **ユーザーフッド優先**: 日本語表記、わかりやすいUIメッセージ
7. **パフォーマンス**: Core Web Vitals を継続監視
8. **LINE非依存**: PWA通知で完全に独立した通知実現

### 2.3 コーディング規約

- **言語**: TypeScript（strict モード）
- **コンポーネント**: React Function Components + Hooks
- **スタイル**: Tailwind CSS + shadcn/ui
- **状態管理**: Zustand（グローバル状態）+ React Query（サーバーステート）
- **命名**: camelCase（変数・関数）、PascalCase（コンポーネント）
- **ファイル構造**: Feature-based directory structure

---

## 3. 各機能の詳細設計

### 3.1 PWA機能

#### 3.1.1 概要

Progressive Web App (PWA) 化により、ユーザーはブラウザからアプリとしてインストール可能になり、オフラインでの本機能の使用が可能になります。

#### 3.1.2 実装要件

| 要件 | 詳細 | 優先度 |
|-----|-----|--------|
| **Web App Manifest** | メタデータ、アイコン定義 | P0 |
| **Service Worker** | キャッシュ戦略、オフライン対応 | P0 |
| **インストール プロンプト** | Install UI表示・動作 | P1 |
| **オフライン機能** | 振り返りの一時保存・キャッシュ | P1 |

#### 3.1.3 Web App Manifest 設計

```json
{
  "name": "ReflectHub - 振り返りの力で成長を記録",
  "short_name": "ReflectHub",
  "description": "日々の成長を記録し、AI分析で自己成長を促進するWebアプリ",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1f2937",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-256x256.png",
      "sizes": "256x256",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity", "education"]
}
```

#### 3.1.4 Service Worker 戦略

```typescript
// キャッシュ戦略: Stale-While-Revalidate（SWR）
// - 優先度：High
//   1. キャッシュから応答（即座）
//   2. バックグラウンドでネットワーク更新
//   3. 新鮮なデータはIndexedDBに保存

// キャッシュ対象:
// - Static Assets: /public/** (永続)
// - HTML: /(dashboard|reflection|history)/* (30分)
// - API: /api/** (5分)
// - Images: /images/** (7日)

// Network First:
// - /api/auth/** (認証関連)
// - /api/reflections/** (データ更新時)

// Cache Only:
// - /fonts/** (Webフォント)
// - /icons/** (アイコン)
```

**実装ファイル**: `public/sw.js`

#### 3.1.5 オフライン対応

```typescript
// IndexedDB スキーマ
interface OfflineDraft {
  id: string;
  framework_id: string;
  content: Record<string, string>;
  created_at: string;
  synced: boolean;
}

// オフライン時の動作:
// 1. フォーム入力 → IndexedDB に保存
// 2. ネットワーク復帰 → 自動同期
// 3. 同期失敗 → ローカル通知 + リトライ
```

**実装ファイル**:
- `src/lib/indexeddb/draftStore.ts`
- `src/hooks/useOfflineSync.ts`

#### 3.1.6 インストール UI

```
┌─────────────────────────────────────┐
│  ヘッダー バナー (スマホのみ表示)      │
├─────────────────────────────────────┤
│  "ReflectHub をインストール"          │
│                                     │
│  [インストール]  [後で]             │
└─────────────────────────────────────┘
```

**トリガー**: `beforeinstallprompt` イベント
**実装ファイル**: `src/components/common/InstallPrompt.tsx`

---

### 3.2 AI分析機能

#### 3.2.1 概要

OpenAI API を統合し、ユーザーの振り返り内容から自動的にインサイトを生成します。成長ポイント、改善提案、パターン分析を提供し、自己成長を促進します。

#### 3.2.2 分析機能一覧

| 機能 | 説明 | API パラメータ | 優先度 |
|-----|------|-------------|--------|
| **成長分析** | 前週比の成長を検出 | gpt-4-turbo | P0 |
| **改善提案** | 「Problem」「Try」から改善案生成 | gpt-4-turbo | P0 |
| **パターン認識** | 複数週のデータから傾向抽出 | gpt-4-turbo | P1 |
| **気分トレンド** | 感情スコア（Sentiment Analysis） | gpt-3.5-turbo | P1 |
| **キーワード抽出** | タグの自動提案 | gpt-3.5-turbo | P2 |

#### 3.2.3 API エンドポイント設計

```
POST /api/ai/analyze
  Request:
    {
      reflection_id: string;
      framework: "YWT" | "KPT";
      content: Record<string, string>;
      context?: {
        previous_reflections?: Reflection[];
        date_range?: [string, string];
      }
    }

  Response:
    {
      analysis_id: string;
      insights: {
        growth_points: string[];
        improvement_suggestions: string[];
        emotional_trend: "positive" | "neutral" | "negative";
        key_achievements: string[];
        challenges: string[];
      };
      recommendations: {
        actions: string[];
        focus_areas: string[];
      };
      generated_at: string;
      tokens_used: number;
    }
```

#### 3.2.4 実装ファイル構成

```
src/
├── services/
│   └── aiAnalysisService.ts       # AI分析ビジネスロジック
├── api/
│   └── ai/
│       └── analyze/route.ts       # POST /api/ai/analyze
├── components/
│   ├── analysis/
│   │   ├── AnalysisPanel.tsx      # 分析結果表示パネル
│   │   ├── InsightCard.tsx        # インサイトカード
│   │   ├── RecommendationList.tsx # 改善提案リスト
│   │   └── EmotionalTrend.tsx     # 感情トレンド表示
│   └── reflection/
│       └── AnalyzedReflection.tsx # 分析付き振り返び表示
├── hooks/
│   └── useAIAnalysis.ts          # 分析カスタムフック
└── types/
    └── analysis.ts               # 分析関連型定義
```

#### 3.2.5 セキュリティ対策

1. **レート制限**: ユーザーあたり1日3回まで
2. **認証**: API Routes で認証確認
3. **トークン消費管理**: 月額トークン上限の設定
4. **プロンプトインジェクション対策**: 入力の厳密なバリデーション
5. **プライベート情報保護**: 個人情報の除外フィルター

---

### 3.3 統計ダッシュボード

#### 3.3.1 概要

ユーザーの振り返り履歴から統計データを自動計算し、成長の可視化を提供します。グラフ・チャート・ゲーミフィケーション要素を含みます。

#### 3.3.2 ダッシュボード構成

```
┌─────────────────────────────────────────────────┐
│        統計ダッシュボード / Analytics              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │  総振り返し数     │  │  今月の振り返し   │   │
│  │     42回        │  │      12回       │   │
│  └──────────────────┘  └──────────────────┘   │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │  連続日数        │  │  平均文字数       │   │
│  │     7日        │  │    450文字      │   │
│  └──────────────────┘  └──────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  振り返し頻度（過去30日）                 │  │
│  │  [Line Chart]                           │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────┐  ┌────────────┐           │
│  │ フレームワーク│  │ 気分分析    │           │
│  │  使用分布    │  │  (Sentiment)│           │
│  │ [Pie Chart]  │  │ [Bar Chart] │           │
│  └──────────────┘  └────────────┘           │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  アクティビティカレンダー                 │  │
│  │  [GitHub-style Heatmap]                 │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  成長トレンド（3ヶ月）                   │  │
│  │  [Area Chart with Trend]                │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### 3.3.3 統計メトリクス仕様

| メトリクス | 計算方法 | 表示頻度 | 実装 |
|----------|--------|--------|------|
| **総振り返し数** | COUNT(reflections) | リアルタイム | Basic |
| **今月の振り返し** | COUNT(reflections WHERE month=now) | リアルタイム | Basic |
| **連続日数** | MAX(consecutive_days) | 日次更新 | Moderate |
| **平均文字数** | AVG(content_length) | リアルタイム | Basic |
| **フレームワーク分布** | COUNT GROUP BY framework | リアルタイム | Basic |
| **気分トレンド** | Sentiment Analysis (AI) | 週次 | Advanced |
| **成長スコア** | Composite metric (複合指標) | 週次 | Advanced |

#### 3.3.4 グラフ・チャートライブラリ

**ライブラリ選定**: Recharts (React対応、柔軟、軽量)

**ファイル構成**:
```
src/components/analytics/
├── StatsOverview.tsx         # KPI表示
├── ReflectionFreency.tsx     # 頻度チャート
├── FrameworkDistribution.tsx # フレームワーク分布
├── EmotionalTrend.tsx        # 感情トレンド
├── ActivityHeatmap.tsx       # アクティビティカレンダー
└── GrowthTrendChart.tsx      # 成長トレンド
```

#### 3.3.5 実装ファイル構成

```
src/
├── services/
│   └── analyticsService.ts   # 統計集計ロジック
├── api/
│   └── analytics/
│       └── [統計エンドポイント]
├── components/
│   └── analytics/
│       └── [各チャートコンポーネント]
├── hooks/
│   └── useAnalytics.ts       # 分析データ取得 Hook
└── types/
    └── analytics.ts          # 分析型定義
```

---

### 3.4 Web プッシュ通知機能

#### 3.4.1 概要

Service Worker と Push API を活用し、ユーザーがアプリをインストール後、日次リマインダーをブラウザ通知として受信できます。LINE に依存しない、完全に自己完結した通知システムです。

#### 3.4.2 実装要件

| 要件 | 詳細 | 優先度 |
|-----|-----|--------|
| **通知許可 UI** | ユーザーが通知の許可/拒否を選択 | P0 |
| **Push API 統合** | Service Worker での Push 受信 | P0 |
| **リマインダー スケジューリング** | 日次リマインダー定時配信 | P0 |
| **通知ペイロード** | 日本語テキスト、アクション定義 | P0 |
| **設定管理** | ユーザーが時間・頻度を設定可能 | P1 |

#### 3.4.3 ユーザーフロー

```
【フロー】
1. ユーザーが PWA をインストール
   ↓
2. "通知を受け取りますか？" プロンプト表示
   ↓
3. ユーザーが承認
   ↓
4. ブラウザが Permission 付与
   ↓
5. 毎日 20:00（設定可能）に通知配信
   →「ReflectHub: 今日の振り返りはしましたか？」
   →クリックで /reflection ページへ遷移
```

#### 3.4.4 通知内容例

```
【タイトル】
"ReflectHub - 振り返り時間"

【本文】
"今日の学びや気付きを記録しませんか？"

【アクション】
[記録する] → /reflection
[あとで]   → 通知を閉じる
```

#### 3.4.5 実装ファイル構成

```
src/
├── lib/push/
│   └── client.ts              # Web Push API クライアント
├── services/
│   └── reminderService.ts     # リマインダーロジック
├── hooks/
│   └── usePushNotification.ts # 通知管理 Hook
├── components/common/
│   └── PushNotificationPrompt.tsx # 許可リクエスト UI
├── api/
│   └── reminders/
│       ├── route.ts           # リマインダー設定 API
│       └── send/route.ts      # リマインダー送信 API
├── jobs/
│   └── dailyReminderJob.ts    # バックエンド スケジューラー
├── types/
│   └── push.ts                # 通知型定義
└── tests/push/
    └── client.test.ts         # Web Push テスト

public/
└── sw.js                      # Service Worker (Push API 対応)
```

#### 3.4.6 設定管理

```typescript
// user_preferences テーブルに追加
interface UserPreferences {
  user_id: string;

  // 既存フィールド
  pwa_install_dismissed: boolean;
  dashboard_view: "cards" | "charts" | "hybrid";

  // Web Push 設定（新規）
  push_notifications_enabled: boolean;
  reminder_time: string;           // "20:00" 形式
  reminder_frequency: "daily" | "weekdays"; // 平日のみ or 毎日
  timezone: string;                 // Asia/Tokyo など

  created_at: string;
  updated_at: string;
}
```

#### 3.4.7 バックエンド リマインダー スケジューラー

```typescript
// Daily reminder job
// 実行時間: 毎日 UTC 11:00 (日本時間 20:00)

export async function dailyReminderJob() {
  // 1. 通知が有効なユーザーを取得
  const users = await getEnabledUsers();

  // 2. ユーザーのタイムゾーンで 20:00 か確認
  for (const user of users) {
    if (isReminderTime(user.timezone, user.reminder_time)) {
      // 3. Push Subscription 取得
      const subscription = await getPushSubscription(user.id);

      // 4. Push 通知送信
      await sendPushNotification(subscription, {
        title: 'ReflectHub - 振り返り時間',
        body: '今日の学びや気付きを記録しませんか？',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'daily-reminder',
        data: {
          url: '/reflection',
          userId: user.id
        }
      });
    }
  }
}
```

---

## 4. 技術スタック・構成

### 4.1 フロントエンド

| レイヤー | 技術 | バージョン | 用途 |
|--------|------|----------|------|
| **フレームワーク** | Next.js App Router | 15.5.2 | Server-side rendering, API Routes |
| **UI Library** | React | 19.1.0 | Component-based UI |
| **言語** | TypeScript | ^5 | Type safety |
| **スタイリング** | Tailwind CSS | ^4 | Utility-first CSS |
| **UI Components** | shadcn/ui | 0.9.5 | Pre-built accessible components |
| **Icon Library** | Lucide React | ^0.542.0 | SVG Icons |
| **Chart Library** | Recharts | ^2.12.0 | Composable charting |
| **状態管理** | Zustand | ^5.0.8 | Global state |
| **Server State** | React Query | ^5.85.5 | Data fetching & caching |
| **Validation** | DOMPurify | ^3.3.0 | XSS prevention |
| **Date Utils** | date-fns | ^4.1.0 | Date manipulation |

### 4.2 バックエンド / API

| レイヤー | 技術 | 用途 |
|--------|------|------|
| **Server Framework** | Next.js API Routes | RESTful API endpoints |
| **Auth** | Supabase Auth | OAuth, Session management |
| **Database** | Supabase PostgreSQL | Data persistence |
| **ORM** | Supabase SDK | Database queries |
| **AI/ML** | OpenAI API | Text analysis, insights |
| **Storage** | Supabase Storage | File/Image uploads |
| **Cron Jobs** | node-cron (or Vercel Crons) | リマインダー送信スケジューラー |
| **Monitoring** | Vercel Analytics | Performance monitoring |

### 4.3 インフラストラクチャ

| コンポーネント | サービス | 用途 |
|-------------|---------|------|
| **Hosting** | Vercel | Deployment & hosting |
| **Database** | Supabase PostgreSQL | Data storage |
| **Auth** | Supabase Auth | User authentication |
| **Real-time** | Supabase Realtime (Optional) | WebSocket connectivity |
| **CDN** | Vercel Edge Network | Static asset delivery |
| **Monitoring** | Vercel Analytics + Sentry (Future) | Error tracking & APM |
| **Push Service** | Web Push API + Service Worker | ブラウザプッシュ配信 |

### 4.4 開発ツール

| ツール | バージョン | 用途 |
|--------|----------|------|
| **Package Manager** | npm | Dependency management |
| **Type Checker** | TypeScript | Type safety |
| **Linter** | ESLint | Code quality |
| **Formatter** | Prettier | Code formatting |
| **Test Runner** | Vitest | Unit/Integration tests |
| **E2E Testing** | Playwright (Future) | End-to-end testing |
| **Git Hooks** | Husky | Pre-commit automation |

---

## 5. API設計

### 5.1 新規エンドポイント一覧

#### AI分析関連

```
POST /api/ai/analyze
  認証: Required
  レート制限: 1日3回
  入力: { reflection_id, framework, content }
  出力: { analysis_id, insights, recommendations, tokens_used }

GET /api/ai/analyses/:id
  認証: Required
  出力: { analysis }

GET /api/ai/analyses?reflection_id=:id
  認証: Required
  出力: { analyses: [] }

DELETE /api/ai/analyses/:id
  認証: Required (所有者のみ)
  出力: { success: boolean }
```

#### 統計分析関連

```
GET /api/analytics/summary
  認証: Required
  パラメータ: date_from?, date_to?
  出力: { summary: AnalyticsData }

GET /api/analytics/trends
  認証: Required
  パラメータ: period="daily"|"weekly"|"monthly"
  出力: { trends: TrendData[] }

GET /api/analytics/distribution
  認証: Required
  パラメータ: group_by="framework"|"day_of_week"
  出力: { distribution: Record<string, number> }
```

#### Web Push 通知関連

```
POST /api/push/subscribe
  認証: Required
  入力: { subscription: PushSubscription }
  出力: { success: boolean }

POST /api/push/unsubscribe
  認証: Required
  出力: { success: boolean }

GET /api/reminders/preferences
  認証: Required
  出力: { preferences: ReminderPreferences }

POST /api/reminders/preferences
  認証: Required
  入力: { reminder_time, reminder_frequency, timezone }
  出力: { preferences: ReminderPreferences }

POST /api/reminders/send
  認証: Internal (Cron job)
  入力: { user_id }
  出力: { success: boolean }
```

### 5.2 エラーハンドリング設計

```typescript
interface ApiError {
  code: string;           // e.g., "RATE_LIMIT_EXCEEDED"
  message: string;        // ユーザー向けメッセージ（日本語）
  status: number;         // HTTP Status Code
  details?: {
    reason?: string;
    retry_after?: number;
    suggestion?: string;
  };
  trace_id?: string;      // エラー追跡ID
}
```

---

## 6. データモデル拡張

### 6.1 新規テーブル: analyses

```typescript
interface Analysis {
  id: string;                      // UUID
  user_id: string;                 // FK: profiles.id
  reflection_id: string;           // FK: reflections.id

  // 分析結果
  growth_points: string[];
  improvement_suggestions: string[];
  emotional_trend: "positive" | "neutral" | "negative";
  key_achievements: string[];
  challenges: string[];

  recommendations: {
    actions: string[];
    focus_areas: string[];
  };

  metadata: {
    tokens_used: number;
    model: string;                 // e.g., "gpt-4-turbo"
    version: string;
  };

  created_at: string;
  updated_at: string;
}
```

### 6.2 新規テーブル: push_subscriptions

```typescript
interface PushSubscription {
  id: string;                      // UUID
  user_id: string;                 // FK: profiles.id
  endpoint: string;                // Push service endpoint
  p256dh: string;                  // Encryption key
  auth: string;                    // Auth secret
  user_agent: string;              // Device info
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 6.3 拡張テーブル: reflections

```typescript
interface Retrospective {
  // 既存フィールド
  id: string;
  user_id: string;
  framework_id: string;
  content: Record<string, string>;
  reflection_date: string;

  // 新規フィールド
  sentiment?: "positive" | "neutral" | "negative";
  keywords?: string[];              // AI抽出キーワード
  analysis_status?: "pending" | "completed" | "failed";
  mood_score?: number;              // 1-5
  growth_score?: number;            // AI計算

  created_at: string;
  updated_at: string;
}
```

### 6.4 新規テーブル: user_preferences

```typescript
interface UserPreferences {
  user_id: string;                   // FK: profiles.id, Primary Key

  // PWA設定
  pwa_install_dismissed: boolean;

  // Web Push 設定
  push_notifications_enabled: boolean;
  reminder_time: string;             // "20:00" 形式
  reminder_frequency: "daily" | "weekdays";
  timezone: string;                  // Asia/Tokyo など

  // ダッシュボード設定
  dashboard_view: "cards" | "charts" | "hybrid";
  preferred_metrics: string[];

  created_at: string;
  updated_at: string;
}
```

### 6.5 RLS ポリシー更新

```sql
-- analyses テーブル
CREATE POLICY "Users can view their own analyses"
  ON analyses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON analyses FOR DELETE USING (auth.uid() = user_id);

-- push_subscriptions テーブル
CREATE POLICY "Users can manage their push subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- user_preferences テーブル
CREATE POLICY "Users can manage their preferences"
  ON user_preferences FOR ALL USING (auth.uid() = user_id);
```

---

## 7. セキュリティ設計

### 7.1 認証・認可

| 対策 | 実装方法 | ステータス |
|-----|--------|----------|
| **OAuth認証** | Google + Supabase Auth | ✅ 既存 |
| **セッション管理** | JWT トークン + HttpOnly Cookie | ✅ 既存 |
| **CSRF保護** | SameSite Cookie + トークン検証 | 🔄 拡張 |
| **API認証** | Bearer Token in Authorization Header | ✅ 既存 |
| **権限検証** | RLS ポリシー + API レイヤー検証 | ✅ 既存 |
| **レート制限** | API エンドポイント毎 | 🆕 新規 |

### 7.2 入力検証・サニタイゼーション

| 検証項目 | 実装方法 | 優先度 |
|---------|--------|--------|
| **HTML サニタイズ** | DOMPurify | P0 ✅ |
| **SQLインジェクション対策** | Parameterized queries (Supabase SDK) | P0 ✅ |
| **XSS対策** | React自動エスケープ + DOMPurify | P0 ✅ |
| **長さ制限** | Frontend + Backend 両層チェック | P0 ✅ |
| **型チェック** | TypeScript strict mode | P0 ✅ |
| **URLバリデーション** | 許可リスト方式 | P1 🔄 |
| **JSONスキーマ検証** | zod/yup による検証 | P1 🔄 |

### 7.3 OpenAI API セキュリティ

```typescript
// API キー管理
// - 環境変数: OPENAI_API_KEY (.env.local)
// - Server-side only (API Routes から呼び出し)
// - クライアント側では絶対に公開しない

// プロンプトインジェクション対策
const sanitizePrompt = (input: string): string => {
  // 1. 長さ制限
  if (input.length > 3000) throw new Error('入力が長すぎます');

  // 2. 危険な記号削除
  const dangerous = /[<script>|<iframe>|javascript:|onerror=]/g;
  const sanitized = input.replace(dangerous, '');

  return sanitized;
};
```

### 7.4 HTTPS・Transport Security

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
];
```

---

## 8. テスト戦略

### 8.1 テスト概要

| テストタイプ | 対象 | ツール | 目標カバレッジ |
|-----------|-----|--------|------------|
| **ユニットテスト** | Utils, Services, Hooks | Vitest | 85%+ |
| **統合テスト** | API Routes, Supabase Integration | Vitest + Supertest | 70%+ |
| **E2Eテスト** | User flows, Critical paths | Playwright (Future) | 50%+ |
| **パフォーマンステスト** | Core Web Vitals, Load testing | Lighthouse, k6 | P90 < 2s |

### 8.2 主要テストケース

```typescript
// AI分析テスト
describe('AI Analysis Service', () => {
  test('should analyze reflection correctly');
  test('should handle OpenAI API errors');
  test('should apply rate limiting');
});

// 統計テスト
describe('Analytics Service', () => {
  test('should calculate summary correctly');
  test('should generate trend data');
});

// Push 通知テスト
describe('Push Notification', () => {
  test('should subscribe to push notifications');
  test('should send reminder notifications');
  test('should handle subscription errors');
});

// PWA テスト
describe('Service Worker', () => {
  test('should cache static assets');
  test('should handle offline requests');
});
```

---

## 9. パフォーマンス・最適化

### 9.1 Core Web Vitals 目標

| メトリクス | 目標値 | 現在値 (推定) |
|-----------|--------|----------|
| **LCP** (Largest Contentful Paint) | < 2.5s | ? |
| **FID** (First Input Delay) | < 100ms | ? |
| **CLS** (Cumulative Layout Shift) | < 0.1 | ? |

### 9.2 最適化施策

```typescript
// Code Splitting
const AnalyticsPanel = dynamic(() =>
  import('@/components/analytics/AnalyticsPanel'),
  { loading: () => <LoadingSpinner /> }
);

// キャッシング戦略
export const revalidate = 3600; // ISR: 1時間ごと
```

---

## 10. デプロイメント・ロールアウト

### 10.1 本番環境要件

| 要件 | 詳細 |
|-----|------|
| **ホスティング** | Vercel Pro |
| **データベース** | Supabase Pro |
| **SSL証明書** | 自動（Let's Encrypt via Vercel） |
| **監視** | Vercel Analytics + Sentry (Future) |

### 10.2 本番環境チェックリスト

- [ ] All tests passing (100% coverage for critical paths)
- [ ] Lighthouse score >= 90
- [ ] Core Web Vitals 達成
- [ ] Environment variables set
- [ ] Database backups configured
- [ ] Error monitoring enabled
- [ ] Security headers present
- [ ] Rate limiting active

---

## 11. 実装スケジュール

### 11.1 Phase 3 タイムライン（14日間）

```
Week 1 (Day 1-7)
├─ Day 1-2: PWA基盤構築
│  ├─ Web App Manifest
│  ├─ Service Worker
│  └─ インストール UI
├─ Day 3-4: AI分析機能
│  ├─ OpenAI API 統合
│  ├─ 分析エンドポイント
│  └─ 分析結果 UI
├─ Day 5-6: 統計ダッシュボード
│  ├─ KPI計算ロジック
│  ├─ Recharts 統合
│  └─ 基本チャート表示
└─ Day 7: Web プッシュ通知 Phase 1
   ├─ Push API 統合
   └─ 通知許可 UI

Week 2 (Day 8-14)
├─ Day 8-9: 統計ダッシュボード拡張
│  ├─ 高度な分析チャート
│  └─ アクティビティヒートマップ
├─ Day 10-11: Web プッシュ通知 Phase 2
│  ├─ リマインダー スケジューリング
│  ├─ バックエンド Job 実装
│  └─ 設定管理
├─ Day 12-13: テスト・セキュリティ
│  ├─ テスト実装（AI, Analytics, Push）
│  ├─ CSRF対策
│  ├─ 入力検証強化
│  └─ セキュリティテスト
└─ Day 14: 本番準備・リリース
   ├─ Core Web Vitals 最適化
   ├─ パフォーマンステスト
   └─ 本番環境デプロイ
```

### 11.2 マイルストーン

| マイルストーン | 期日 | 成果物 |
|-------------|------|--------|
| **PWA基盤完成** | Day 2 | インストール可能な状態 |
| **AI分析機能完成** | Day 4 | 分析結果表示 |
| **統計ダッシュボード完成** | Day 6 | KPI + チャート |
| **Web プッシュ完成** | Day 11 | リマインダー配信 |
| **テスト完了** | Day 13 | テストカバレッジ 80%+ |
| **本番リリース** | Day 14 | Live |

---

## 12. リスク管理

### 12.1 主要リスク一覧

| リスク | 影響度 | 確度 | 対策 |
|--------|--------|------|------|
| **OpenAI API レート制限** | High | High | キャッシング、バッチ処理、フォールバック |
| **Supabase ダウンタイム** | High | Low | Retry logic、ローカルキャッシュ |
| **Service Worker バグ** | Medium | Medium | 徹底テスト、段階的ロールアウト |
| **Web Push 非対応ブラウザ** | Medium | Low | Graceful degradation、フォールバック UI |
| **Core Web Vitals 未達** | Medium | Medium | 継続的な最適化、監視 |

---

## 付録

### 参考リンク

- [Web App Manifest - MDN](https://developer.mozilla.org/docs/Web/Manifest)
- [Service Worker - MDN](https://developer.mozilla.org/docs/Web/API/Service_Worker_API)
- [Web Push API - MDN](https://developer.mozilla.org/docs/Web/API/Push_API)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Recharts Documentation](https://recharts.org/)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)

### 用語集

| 用語 | 説明 |
|-----|------|
| **PWA** | Progressive Web Application |
| **Service Worker** | バックグラウンドで動作するスクリプト |
| **Push API** | ブラウザプッシュ通知 |
| **Cron Job** | 定期的に実行するバックエンドジョブ |
| **RLS** | Row-Level Security (Supabase) |
| **Core Web Vitals** | Google が定義するページパフォーマンス指標 |

---

## 更新履歴

| バージョン | 日付 | 更新内容 |
|----------|------|--------|
| 1.0 | 2025-11-18 | 初版作成 |
| 2.0 | 2025-11-18 | LINE連携削除、Web Push 通知追加 |

---

**ドキュメント作成者**: Claude Code Design Team
**最終レビュー日**: 2025-11-18
**次回レビュー予定**: 実装開始時
