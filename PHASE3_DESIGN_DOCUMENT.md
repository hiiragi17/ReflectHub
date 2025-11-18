# ReflectHub Phase 3 詳細設計書

## ドキュメント情報

| 項目 | 内容 |
|-----|-----|
| **ドキュメント名** | ReflectHub Phase 3 詳細設計書 |
| **バージョン** | 1.0 |
| **作成日** | 2025-11-18 |
| **ステータス** | Draft |
| **対応するIssue** | #39 |
| **期間** | Phase 3（21日間実装計画） |

---

## 目次

1. [概要・目的](#1-概要目的)
2. [設計方針・原則](#2-設計方針原則)
3. [各機能の詳細設計](#3-各機能の詳細設計)
   - [3.1 PWA機能](#31-pwa機能)
   - [3.2 AI分析機能](#32-ai分析機能)
   - [3.3 統計ダッシュボード](#33-統計ダッシュボード)
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
| **セキュリティ強化** | 本番環境への耐性確保 | CSRF対策、入力検証強化、監視機構 |
| **テスト体制確立** | 品質保証・回帰テスト | Unit・Integration・E2E テストの実装 |
| **本番デプロイ** | Vercel上での安定稼働 | ヘルスチェック、エラー監視、ホットスタンバイ |

### 1.2 ステークホルダー・対象ユーザー

- **Primary User**: 日本の若手ビジネスパーソン（25-40代）
- **Use Case**: 日々の振り返り、自己成長の記録・分析
- **環境**: スマートフォン・タブレット・PCでのアクセス

### 1.3 成功指標

| KPI | 目標値 | 測定方法 |
|-----|--------|--------|
| **Lighthouse スコア** | 90以上 | Vercel Analytics |
| **ページ遷移速度** | < 2秒 | Core Web Vitals |
| **テストカバレッジ** | > 80% | Vitest + Istanbul |
| **API応答時間** | < 500ms | APM（Application Performance Monitoring） |
| **可用性** | 99.5%以上 | 監視ダッシュボード |

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
│  (Supabase DB + OpenAI API + Vercel)               │
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

Progressive Web App (PWA) 化により、ユーザーはブラウザからアプリとしてインストール可能になり、オフラインでの機本機能の使用が可能になります。

#### 3.1.2 実装要件

| 要件 | 詳細 | 優先度 |
|-----|-----|--------|
| **Web App Manifest** | メタデータ、アイコン定義 | P0 |
| **Service Worker** | キャッシュ戦略、オフライン対応 | P0 |
| **インストール プロンプト** | Install UI表示・動作 | P1 |
| **オフライン機能** | 振り返りの一時保存・キャッシュ | P1 |
| **プッシュ通知** | 日次リマインダー（オプション） | P2 |

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
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/screenshot-2.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "新規振り返り作成",
      "short_name": "新規作成",
      "description": "新しい振り返りを記録する",
      "url": "/reflection?mode=new",
      "icons": [
        {
          "src": "/icons/shortcut-new.png",
          "sizes": "192x192"
        }
      ]
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

#### 3.2.4 データフロー

```
┌──────────────────┐
│  振り返り作成    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  AI分析トリガー          │
│  (ユーザーボタンまたは   │
│   自動（オプション）)    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  OpenAI API呼び出し      │
│  (Streaming対応)        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  分析結果をDB保存        │
│  (analyses テーブル)     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  UI上に結果表示          │
│  (アニメーション付き)    │
└──────────────────────────┘
```

#### 3.2.5 実装ファイル構成

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

#### 3.2.6 セキュリティ対策

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

```typescript
// インストール
npm install recharts

// 使用例
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie,
  AreaChart, Area,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
```

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

#### 3.3.5 データ集計ロジック

```typescript
interface AnalyticsData {
  summary: {
    totalReflections: number;
    thisMonthCount: number;
    consecutiveDays: number;
    averageLength: number;
  };

  distribution: {
    byFramework: Record<string, number>;
    byDayOfWeek: Record<string, number>;
  };

  trends: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };

  insights: {
    mostActiveDay: string;
    preferredFramework: string;
    averageWordCount: number;
    growthRate: number; // %
  };
}
```

**実装ファイル**: `src/services/analyticsService.ts`

#### 3.3.6 ページ構成

```
/dashboard/analytics
  │
  ├── Header (日付範囲フィルター)
  │
  ├── KPI Cards (Summary Stats)
  │
  ├── Charts Section
  │   ├── Reflection Frequency
  │   ├── Framework Distribution
  │   ├── Emotional Trends
  │   └── Activity Heatmap
  │
  ├── Growth Analysis Section
  │   └── Growth Trend Chart
  │
  └── Achievements/Badges Section
      └── Gamification Elements
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
| **Email** | Supabase Mail (Optional) | Transactional emails |

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
  エラー: 401, 429, 500

GET /api/ai/analyses/:id
  認証: Required
  出力: { analysis }
  エラー: 401, 404, 500

GET /api/ai/analyses?reflection_id=:id
  認証: Required
  出力: { analyses: [] }
  エラー: 401, 500

DELETE /api/ai/analyses/:id
  認証: Required (所有者のみ)
  出力: { success: boolean }
  エラー: 401, 403, 404, 500
```

#### 統計分析関連

```
GET /api/analytics/summary
  認証: Required
  パラメータ: date_from?, date_to?
  出力: { summary: AnalyticsData }
  エラー: 401, 500

GET /api/analytics/trends
  認証: Required
  パラメータ: period="daily"|"weekly"|"monthly", days=30
  出力: { trends: TrendData[] }
  エラー: 401, 500

GET /api/analytics/distribution
  認証: Required
  パラメータ: group_by="framework"|"day_of_week"
  出力: { distribution: Record<string, number> }
  エラー: 401, 500
```

### 5.2 既存エンドポイント拡張

```
GET /api/reflections/:id
  追加フィールド:
    + analysis?: AnalysisResult
    + sentiment?: "positive"|"neutral"|"negative"
    + keywords?: string[]

GET /api/reflections?user_id=:id
  追加フィルター:
    + date_from: string (YYYY-MM-DD)
    + date_to: string (YYYY-MM-DD)
    + framework: "YWT"|"KPT"
    + sentiment: "positive"|"neutral"|"negative"
```

### 5.3 エラーハンドリング設計

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

// エラーコード例:
// - INVALID_REQUEST: 400
// - UNAUTHORIZED: 401
// - FORBIDDEN: 403
// - NOT_FOUND: 404
// - RATE_LIMIT_EXCEEDED: 429
// - INTERNAL_SERVER_ERROR: 500
// - SERVICE_UNAVAILABLE: 503
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

### 6.2 拡張テーブル: reflections

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

### 6.3 拡張テーブル: frameworks

```typescript
interface Framework {
  // 既存フィールド
  id: string;
  name: string;
  display_name: string;
  schema: FieldSchema[];

  // 新規フィールド
  recommended_ai_analysis: boolean;  // AI分析推奨フラグ
  analysis_prompt_template?: string; // カスタムプロンプト

  created_at: string;
  updated_at: string;
}
```

### 6.4 新規テーブル: user_preferences (オプション)

```typescript
interface UserPreferences {
  user_id: string;                   // FK: profiles.id, Primary Key

  // PWA設定
  pwa_install_dismissed: boolean;
  notifications_enabled: boolean;

  // 分析設定
  auto_analyze_enabled: boolean;
  analysis_frequency: "manual" | "daily" | "weekly";

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
  ON analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- reflections テーブル（既存拡張）
-- sentiment, keywords フィールドへのアクセスは上記と同様
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

### 7.2 CSRF対策実装

```typescript
// POST /api/reflections
// Request Header: X-CSRF-Token

// サーバー側バリデーション
const validateCSRFToken = (req: NextRequest) => {
  const token = req.headers.get('x-csrf-token');
  const sessionToken = req.cookies.get('__Secure-session');

  // トークンマッチング + 署名検証
  return verifyCSRFToken(token, sessionToken);
};

// クライアント側実装
// useCSRFToken hook で自動付与
```

**ファイル**:
- `src/utils/csrfToken.ts`
- `src/middleware.ts`（CSRF検証追加）
- `src/hooks/useCSRFToken.ts`

### 7.3 入力検証・サニタイゼーション

| 検証項目 | 実装方法 | 優先度 |
|--------|--------|--------|
| **HTML サニタイズ** | DOMPurify | P0 ✅ |
| **SQLインジェクション対策** | Parameterized queries (Supabase SDK) | P0 ✅ |
| **XSS対策** | React自動エスケープ + DOMPurify | P0 ✅ |
| **長さ制限** | Frontend + Backend 両層チェック | P0 ✅ |
| **型チェック** | TypeScript strict mode | P0 ✅ |
| **URLバリデーション** | 許可リスト方式 | P1 🔄 |
| **JSONスキーマ検証** | zod/yup による検証 | P1 🔄 |

### 7.4 OpenAI API セキュリティ

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

  // 3. システムプロンプト埋め込み防止
  const systemPromptPatterns = /ignore|override|system|admin|root/gi;
  if (systemPromptPatterns.test(input)) {
    throw new Error('無効な入力です');
  }

  return sanitized;
};

// レート制限
// - ユーザーあたり: 1日3回
// - Redis/Supabase で追跡
```

**ファイル**:
- `src/lib/openai/client.ts`
- `src/api/ai/analyze/route.ts`（レート制限実装）

### 7.5 HTTPS・Transport Security

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
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
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

### 8.2 テスト計画

#### Phase 3.1: AI分析機能テスト

```typescript
// test/services/aiAnalysisService.test.ts
describe('AI Analysis Service', () => {
  // Mock OpenAI API
  const mockOpenAI = {
    createChatCompletion: vi.fn()
  };

  test('should analyze reflection correctly', async () => {
    const result = await analyzeReflection({
      framework: 'YWT',
      content: { ... }
    });

    expect(result).toHaveProperty('growth_points');
    expect(result.growth_points).toBeInstanceOf(Array);
  });

  test('should handle OpenAI API errors', async () => {
    mockOpenAI.createChatCompletion.mockRejectedValue(
      new Error('Rate limit exceeded')
    );

    expect(() => analyzeReflection(...))
      .rejects.toThrow('Rate limit exceeded');
  });

  test('should apply rate limiting', async () => {
    // 1日3回のリミット検証
  });
});
```

#### Phase 3.2: 統計機能テスト

```typescript
// test/services/analyticsService.test.ts
describe('Analytics Service', () => {
  test('should calculate summary correctly', () => {
    const reflections = [
      { ... }, { ... }, { ... }
    ];

    const summary = calculateSummary(reflections);

    expect(summary.totalReflections).toBe(3);
    expect(summary.consecutiveDays).toBeGreaterThanOrEqual(0);
  });

  test('should generate trend data', () => {
    const trends = generateTrends(reflections, 'daily');

    expect(trends).toBeInstanceOf(Array);
    expect(trends[0]).toHaveProperty('date');
    expect(trends[0]).toHaveProperty('count');
  });
});
```

#### Phase 3.3: PWA テスト

```typescript
// test/pwa/serviceWorker.test.ts
describe('Service Worker', () => {
  test('should cache static assets', async () => {
    const response = await fetch('/dashboard');
    // Cache hit verification
  });

  test('should handle offline requests', async () => {
    // Simulate offline mode
    // Verify fallback behavior
  });
});
```

### 8.3 E2E テストシナリオ（Future - Playwright）

```typescript
test('User can create reflection, get AI analysis, view analytics', async () => {
  // 1. ログイン
  await page.goto('/auth');
  await page.click('button:has-text("Google でログイン")');

  // 2. 振り返り作成
  await page.goto('/reflection');
  await page.fill('textarea[name="did"]', 'テスト実施');
  await page.click('button:has-text("保存")');

  // 3. AI分析リクエスト
  await page.click('button:has-text("AI分析を実行")');
  await page.waitForSelector('[data-testid="analysis-result"]');

  // 4. アナリティクス確認
  await page.goto('/dashboard/analytics');
  await page.waitForSelector('canvas'); // チャート読み込み確認
});
```

### 8.4 テスト実行フロー

```bash
# 開発時: ウォッチモード
npm run test:watch

# Pre-commit: リント + ユニットテスト
npm run test:pre-commit

# CI/CD: 全テスト + カバレッジ
npm run test:coverage

# デプロイ前: E2E テスト
npm run test:e2e
```

---

## 9. パフォーマンス・最適化

### 9.1 Core Web Vitals 目標

| メトリクス | 目標値 | 現在値 (推定) |
|-----------|--------|----------|
| **LCP** (Largest Contentful Paint) | < 2.5s | ? |
| **FID** (First Input Delay) | < 100ms | ? |
| **CLS** (Cumulative Layout Shift) | < 0.1 | ? |
| **INP** (Interaction to Next Paint) | < 200ms | ? |

### 9.2 最適化施策

#### 画像最適化

```typescript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    loader: 'default',
    minimumCacheTTL: 60,
  }
};
```

#### Code Splitting

```typescript
// 動的インポート: 重いコンポーネント
const AnalyticsPanel = dynamic(() =>
  import('@/components/analytics/AnalyticsPanel'),
  { loading: () => <LoadingSpinner /> }
);

// Route-based: ページコンポーネント
// Next.js が自動で最適化
```

#### キャッシング戦略

```typescript
// ISR (Incremental Static Regeneration)
export const revalidate = 3600; // 1時間ごとに再生成

// SWR (Stale-While-Revalidate)
const { data } = useSWR('/api/analytics/summary', {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 300000, // 5分
});
```

#### バンドルサイズ最適化

```bash
# バンドル分析
npm run analyze

# 目標: Main bundle < 200KB (gzipped)
# Recharts は必要に応じて lazy load
```

### 9.3 ローディング状態

```typescript
// Skeleton Loading
<Skeleton className="w-full h-40" count={3} />

// Streaming (Next.js 13+)
// Server Components で自動最適化
```

### 9.4 データベースクエリ最適化

```typescript
// インデックス設計
CREATE INDEX idx_reflections_user_date
  ON reflections(user_id, reflection_date DESC);

CREATE INDEX idx_analyses_reflection
  ON analyses(reflection_id);

// 不要なフィールドの除外
const { id, user_id, content, created_at } =
  await supabase
    .from('reflections')
    .select('id, user_id, content, created_at')
    .eq('user_id', userId);
```

---

## 10. デプロイメント・ロールアウト

### 10.1 本番環境要件

| 要件 | 詳細 |
|-----|------|
| **ホスティング** | Vercel Pro |
| **データベース** | Supabase Pro |
| **SSL証明書** | 自動（Let's Encrypt via Vercel） |
| **CDN** | Vercel Edge Network |
| **監視** | Vercel Analytics + Sentry (Future) |
| **ドメイン** | reflect-hub.app (またはカスタム) |

### 10.2 デプロイメント手順

```bash
# 1. ステージング環境でテスト
git push origin stage-deploy

# 2. Preview deployment 確認
# Vercel が自動で作成

# 3. 本番環境へ
git push origin main

# 4. デプロイ後検証
curl https://reflect-hub.app/api/health
```

### 10.3 本番環境チェックリスト

- [ ] All tests passing (100% coverage for critical paths)
- [ ] Lighthouse score >= 90
- [ ] No console errors/warnings
- [ ] HTTPS working correctly
- [ ] Security headers present
- [ ] Environment variables set
- [ ] Database backups configured
- [ ] Error monitoring enabled
- [ ] CDN cache configured
- [ ] Rate limiting active
- [ ] API throttling working

### 10.4 ロールアウト戦略

#### Phase 3a: Canary Release (Day 20-21)

```
10% のユーザーに新機能をロールアウト
→ メトリクス監視 (1時間)
→ 安定確認後 50% に拡大
→ 最終的に 100% ロールアウト
```

#### Phase 3b: Feature Flags

```typescript
// 機能フラグ: AI分析
if (featureFlags.aiAnalysisEnabled) {
  <AnalysisButton />
}

// Supabase から動的に取得
const flags = await getFeatureFlags(userId);
```

### 10.5 ダウンタイム対策

```typescript
// ヘルスチェック エンドポイント
GET /api/health
  → { status: "ok"|"degraded"|"down" }

// サーキットブレーカーパターン
if (healthStatus === 'degraded') {
  // フォールバック: 簡易版UI表示
  <SimplifiedDashboard />
}
```

---

## 11. 実装スケジュール

### 11.1 Phase 3 タイムライン（21日間）

```
Week 1 (Day 1-7)
├─ Day 1-2: PWA基盤構築
│  ├─ Web App Manifest
│  ├─ Service Worker
│  └─ インストール UI
├─ Day 3-4: AI分析機能 - Phase 1
│  ├─ OpenAI API 統合
│  ├─ 分析エンドポイント
│  └─ 分析結果 UI
└─ Day 5-7: 統計ダッシュボード - Phase 1
   ├─ KPI計算ロジック
   ├─ Recharts 統合
   └─ 基本チャート表示

Week 2 (Day 8-14)
├─ Day 8-9: AI分析機能 - Phase 2
│  ├─ レート制限実装
│  ├─ エラーハンドリング
│  └─ キャッシング
├─ Day 10-11: 統計ダッシュボード - Phase 2
│  ├─ 高度な分析チャート
│  ├─ アクティビティヒートマップ
│  └─ トレンド分析
├─ Day 12: オフライン機能
│  ├─ IndexedDB 設計
│  ├─ 自動同期ロジック
│  └─ 同期状態 UI
└─ Day 13-14: テスト Phase 1
   ├─ AI分析テスト
   ├─ 統計機能テスト
   └─ PWA テスト

Week 3 (Day 15-21)
├─ Day 15-16: セキュリティ強化
│  ├─ CSRF対策
│  ├─ 入力検証強化
│  ├─ OpenAI プロンプトインジェクション対策
│  └─ セキュリティヘッダー設定
├─ Day 17-18: テスト Phase 2
│  ├─ E2E テスト実装（基本）
│  ├─ パフォーマンステスト
│  ├─ セキュリティテスト
│  └─ ユーザー受け入れテスト
├─ Day 19-20: 本番準備・最適化
│  ├─ Core Web Vitals 最適化
│  ├─ バンドルサイズ削減
│  ├─ ドメイン・SSL設定
│  ├─ モニタリング・ロギング
│  └─ デプロイメント自動化
└─ Day 21: リリース・運用開始
   ├─ 本番環境ステージング
   ├─ スモークテスト
   ├─ Canary Release (10% → 50% → 100%)
   └─ 運用ハンドオーバー
```

### 11.2 マイルストーン

| マイルストーン | 期日 | 成果物 |
|-------------|------|--------|
| **PWA基盤完成** | Day 4 | インストール可能な状態 |
| **AI分析機能α** | Day 7 | 分析結果表示 |
| **統計ダッシュボード α** | Day 7 | KPI + 基本チャート |
| **全機能 α 完成** | Day 14 | 機能実装完了 |
| **テスト完了** | Day 18 | テストカバレッジ 80%+ |
| **本番環境 Ready** | Day 20 | Go/No-Go Decision |
| **本番リリース** | Day 21 | Live |

### 11.3 日次スプリント例（Day 1）

```
09:00-09:30  スタンドアップ（進捗確認）
09:30-12:00  実装
12:00-13:00  昼休憩
13:00-15:00  実装 + コードレビュー
15:00-15:30  テスト実施
15:30-17:00  バグ修正・ドキュメント
17:00-17:30  デイリーレビュー・日報
```

---

## 12. リスク管理

### 12.1 主要リスク一覧

| リスク | 影響度 | 確度 | 対策 |
|--------|--------|------|------|
| **OpenAI API レート制限** | High | High | キャッシング、バッチ処理、フォールバック |
| **Supabase ダウンタイム** | High | Low | Retry logic、ローカルキャッシュ |
| **Service Worker バグ** | Medium | Medium | 徹底テスト、段階的ロールアウト |
| **Core Web Vitals 未達** | Medium | Medium | 継続的な最適化、監視 |
| **セキュリティ脆弱性** | High | Medium | セキュリティ監査、SAST ツール |
| **スコープクリープ** | Medium | High | 厳密なスコープ管理、優先度付け |

### 12.2 リスク対策詳細

#### OpenAI API コスト管理

```typescript
// レート制限: 1ユーザー / 1日3回
const MAX_ANALYSES_PER_DAY = 3;

// トークン使用量追跡
const trackTokenUsage = (tokens: number) => {
  // Supabase に記録
  // 月間上限: 100,000 tokens
};

// フォールバック: キャッシュ済み分析を表示
if (analyzisExists()) {
  return cachedAnalysis;
} else {
  return <AnalysisUnavailable />;
}
```

#### Service Worker デプロイ戦略

```typescript
// 段階的ロールアウト
// Phase 1: Canary (10%)
// Phase 2: Beta (50%)
// Phase 3: Stable (100%)

// ロールバック機能
const SW_VERSION = '1.0.0';
if (swVersion < MIN_REQUIRED_VERSION) {
  // 古い Service Worker をアンインストール
  unregisterServiceWorker();
}
```

#### セキュリティ監査

```
- OWASP Top 10 チェック
- Dependency scanning (npm audit)
- SAST ツール (SonarQube, CodeClimate)
- Penetration Testing (外部)
- GDPR / 個人情報保護対応確認
```

### 12.3 本番サポート計画

| 項目 | 詳細 |
|-----|------|
| **監視** | Vercel Analytics + Sentry |
| **アラート** | Slack 通知（クリティカルエラー） |
| **エスカレーション** | on-call rotation |
| **通知テンプレート** | 日本語対応 |
| **災害復旧計画** | データベースバックアップ (日1回) |
| **SLA** | 99.5% uptime |

---

## 13. 付録・参考資料

### 13.1 参考リンク

- [Web App Manifest - MDN](https://developer.mozilla.org/docs/Web/Manifest)
- [Service Worker - MDN](https://developer.mozilla.org/docs/Web/API/Service_Worker_API)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Recharts Documentation](https://recharts.org/)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### 13.2 用語集

| 用語 | 説明 |
|-----|------|
| **PWA** | Progressive Web Application - ネイティブアプリ同様の機能を持つWebアプリ |
| **Service Worker** | バックグラウンドで動作し、オフライン機能やキャッシング を管理するスクリプト |
| **ISR** | Incremental Static Regeneration - Next.js の静的生成機能 |
| **SWR** | Stale-While-Revalidate - キャッシュ戦略 |
| **RLS** | Row-Level Security - Supabase のセキュリティ機構 |
| **CSRF** | Cross-Site Request Forgery - セキュリティ脅威 |
| **XSS** | Cross-Site Scripting - セキュリティ脅威 |
| **Core Web Vitals** | Google が定義するページパフォーマンス指標 |
| **Canary Release** | 段階的なロールアウト戦略 |

### 13.3 チェックリスト

実装時の確認項目:

```
[ ] PWA機能がインストール可能な状態
[ ] Service Worker がオフラインで動作
[ ] AI分析がエラーハンドリング済み
[ ] 統計ダッシュボードが表示可能
[ ] テストカバレッジ 80%以上
[ ] セキュリティヘッダー設定済み
[ ] Lighthouse スコア 90以上
[ ] Core Web Vitals 達成
[ ] 本番環境チェックリスト完了
[ ] ドキュメント完成
[ ] チーム内レビュー承認
```

---

## 更新履歴

| バージョン | 日付 | 更新内容 |
|----------|------|--------|
| 1.0 | 2025-11-18 | 初版作成 |

---

**ドキュメント作成者**: Claude Code Design Team
**最終レビュー日**: 2025-11-18
**次回レビュー予定**: 実装開始時
