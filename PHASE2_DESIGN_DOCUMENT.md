# ReflectHub Phase 2 詳細設計書

## ドキュメント情報

| 項目 | 内容 |
|-----|-----|
| **ドキュメント名** | ReflectHub Phase 2 詳細設計書 |
| **バージョン** | 1.0 |
| **作成日** | 2025-11-18 |
| **ステータス** | Draft |
| **対応するIssue** | TBD（Phase 2関連） |
| **期間** | Phase 2（16日間実装計画） |

---

## 目次

1. [概要・目的](#1-概要目的)
2. [設計方針・原則](#2-設計方針原則)
3. [各機能の詳細設計](#3-各機能の詳細設計)
   - [3.1 複数フレームワーク管理の強化](#31-複数フレームワーク管理の強化)
   - [3.2 高度な統計・トレンド分析](#32-高度な統計トレンド分析)
   - [3.3 UI/UX 改善](#33-uiux-改善)
   - [3.4 エラーハンドリング・監視](#34-エラーハンドリング監視)
   - [3.5 Web プッシュ通知基盤（Preview）](#35-webプッシュ通知基盤preview)
4. [技術スタック・構成](#4-技術スタック構成)
5. [API設計](#5-api設計)
6. [データモデル拡張](#6-データモデル拡張)
7. [テスト戦略](#7-テスト戦略)
8. [パフォーマンス・最適化](#8-パフォーマンス最適化)
9. [実装スケジュール](#9-実装スケジュール)
10. [リスク管理](#10-リスク管理)

---

## 1. 概要・目的

### 1.1 Phase 2 の目標

Phase 1 で実装した基本的な振り返り記録・管理機能を基盤に、Phase 2 では以下の領域を強化し、ユーザーエンゲージメントと機能の奥深さを向上させます。

| 領域 | 目標 | 完成状態 |
|-----|------|--------|
| **フレームワーク管理** | カスタムフレームワーク対応、ユーザーによる拡張可能性 | 複数フレームワークの柔軟な選択・管理 |
| **統計・トレンド分析** | より詳細なデータ分析機能 | KPI表示、傾向グラフ表示、期間比較 |
| **UI/UX 改善** | より直感的で美しいインターフェース | レスポンシブ改善、ダークモード対応（オプション）、アニメーション |
| **エラーハンドリング強化** | より詳細なエラーログと対応 | エラー分類体系、ユーザーフレンドリーなメッセージ、自動回復機構 |
| **テスト体制確立** | 品質保証の仕組み構築 | Unit・Integration テストの実装 |
| **Web プッシュ基盤** | Phase 3 への基盤準備 | push_subscriptions テーブル設計、API 設計 |

### 1.2 成功指標

| KPI | 目標値 | 測定方法 |
|-----|--------|--------|
| **テストカバレッジ** | > 70% | Vitest + Istanbul |
| **ページ遷移速度** | < 3秒 | Core Web Vitals |
| **エラー発生率** | < 1% | エラーログ監視 |
| **ユーザー満足度** | 4.0+/5.0 | ユーザーフィードバック |
| **API応答時間** | < 1秒 | APM 監視 |

---

## 2. 設計方針・原則

### 2.1 Phase 2 の設計方針

1. **拡張性**: フレームワークやフィールドを容易に追加・カスタマイズ可能な設計
2. **ユーザビリティ**: 初心者から上級者まで使いやすいUI設計
3. **信頼性**: エラーハンドリングと監視機構の強化
4. **テスト容易性**: すべての新機能にテストを実装
5. **段階的なロールアウト**: 機能を段階的に導入して検証

### 2.2 コーディング規約

Phase 1 から継続：
- **言語**: TypeScript（strict モード）
- **コンポーネント**: React Function Components + Hooks
- **スタイル**: Tailwind CSS + shadcn/ui
- **状態管理**: Zustand（グローバル状態）+ React Query（サーバーステート）

---

## 3. 各機能の詳細設計

### 3.1 複数フレームワーク管理の強化

#### 3.1.1 概要

Phase 1 で実装した YWT、KPT に加え、以下を実現します：
- より多くのフレームワーク対応
- ユーザーがカスタムフレームワークを作成可能
- フレームワークのテンプレート機能

#### 3.1.2 対応フレームワーク

**デフォルト提供**:
1. **YWT**: やったこと・わかったこと・次にやること
2. **KPT**: Keep・Problem・Try
3. **4L**:  Liked（好きだったこと）・Learned（学んだこと）・Lacked（欠けていたこと）・Longed for（今後期待すること）
4. **STAR**: Situation・Task・Action・Result
5. **振り返り日記**: 時間軸に沿った自由記述形式

#### 3.1.3 フレームワーク管理テーブル設計

```typescript
interface Framework {
  id: string;                      // UUID
  name: string;                    // 一意の識別子（例："YWT"）
  display_name: string;            // 表示名（例："やったこと・わかったこと・次」）
  description: string;             // フレームワークの説明
  icon: string;                    // 絵文字またはアイコンパス
  color: string;                   // テーマカラー（16進数）

  // フィールド定義
  schema: FrameworkField[];

  // メタデータ
  created_by: string;              // 作成者ユーザーID（null = デフォルト）
  is_public: boolean;              // 他ユーザーと共有可能か
  is_default: boolean;             // デフォルトフレームワークか
  sort_order: number;              // ソート順序

  // 統計
  usage_count: number;             // 使用回数
  last_used: string;               // 最後に使用した日時

  created_at: string;
  updated_at: string;
}

interface FrameworkField {
  id: string;                      // フィールド一意識別子
  label: string;                   // 表示ラベル（例："やったこと"）
  placeholder: string;             // プレースホルダーテキスト
  description: string;             // フィールド説明
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  max_length: number;
  order: number;                   // 表示順序
  icon?: string;                   // 絵文字
  hint?: string;                   // ヒントテキスト
}
```

#### 3.1.4 ユーザーカスタムフレームワーク機能

**UI フロー**:
```
[ダッシュボード]
    ↓
[フレームワーク管理]
    ↓
[カスタムフレームワーク作成]
    → フィールド追加・編集
    → プレビュー
    → 保存
```

**実装ファイル**:
- `src/app/settings/frameworks/page.tsx` - フレームワーク管理ページ
- `src/components/frameworks/FrameworkBuilder.tsx` - フレームワーク作成UI
- `src/components/frameworks/FieldEditor.tsx` - フィールド編集コンポーネント
- `src/services/frameworkService.ts` - フレームワーク CRUD ロジック

---

### 3.2 高度な統計・トレンド分析

#### 3.2.1 概要

振り返りデータから有意義な統計情報を抽出し、ユーザーの成長を可視化します。

#### 3.2.2 統計機能一覧

| 統計機能 | 説明 | 実装 |
|---------|------|------|
| **基本KPI** | 総数、今月、連続日数 | Basic |
| **頻度分析** | 週ごと・月ごとの振り返り数 | Basic |
| **フレームワーク分析** | 使用フレームワークの分布 | Moderate |
| **期間比較** | 前月比・前週比の増減 | Moderate |
| **ストリーク分析** | 連続日数、ベストストリーク | Basic |
| **コンテンツ分析** | 平均文字数、キーワードの頻出度 | Advanced |
| **成長スコア** | 複合指標による成長度合いの可視化 | Advanced |

#### 3.2.3 統計データ構造

```typescript
interface StatisticsData {
  summary: {
    total_reflections: number;        // 総振り返し数
    this_month_count: number;         // 今月の数
    consecutive_days: number;         // 連続日数
    average_content_length: number;   // 平均文字数
    most_used_framework: string;      // 最頻使用フレームワーク
  };

  trends: {
    weekly: Array<{
      week: string;                   // "2025-W47"
      count: number;
      frameworks: Record<string, number>;
    }>;
    monthly: Array<{
      month: string;                  // "2025-11"
      count: number;
      growth_percent: number;         // 前月比
    }>;
  };

  distribution: {
    by_framework: Record<string, number>;
    by_day_of_week: Record<string, number>;
    by_hour?: Record<string, number>;
  };

  growth: {
    score: number;                    // 0-100
    trend: "up" | "stable" | "down";
    insights: string[];
  };
}
```

#### 3.2.4 統計ダッシュボード画面設計

```
┌─────────────────────────────────────────┐
│          統計ダッシュボード                  │
├─────────────────────────────────────────┤
│ [今月] [先月] [期間指定]                   │
│                                         │
│ ┌────────┐ ┌────────┐ ┌────────┐      │
│ │ 総数   │ │ 今月   │ │ 連続   │      │
│ │ 42     │ │ 12     │ │ 7日    │      │
│ └────────┘ └────────┘ └────────┘      │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ 振り返し頻度（過去30日）               ││
│ │ [Line Chart]                        ││
│ └─────────────────────────────────────┘│
│                                         │
│ ┌──────────────┐  ┌──────────────┐   │
│ │フレームワーク│  │期間比較      │   │
│ │使用分布     │  │├ 先月比 +15% │   │
│ │├ YWT 35%   │  │├ 先週比 +8%  │   │
│ │├ KPT 45%   │  │└             │   │
│ │└ 4L   20%  │  └──────────────┘   │
│ └──────────────┘                     │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ 成長スコア: 72 / 100                  ││
│ │ ↑ 上昇傾向（過去4週間）                ││
│ └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

#### 3.2.5 実装ファイル

```
src/
├── services/
│   └── analyticsService.ts       # 統計計算ロジック
├── api/
│   └── analytics/
│       ├── summary/route.ts      # GET /api/analytics/summary
│       ├── trends/route.ts       # GET /api/analytics/trends
│       └── distribution/route.ts # GET /api/analytics/distribution
├── components/
│   └── statistics/
│       ├── StatsDashboard.tsx    # ダッシュボード
│       ├── StatsCard.tsx         # KPI カード
│       ├── TrendChart.tsx        # トレンドチャート
│       ├── FrameworkBreakdown.tsx# フレームワーク分布
│       └── GrowthScore.tsx       # 成長スコア表示
├── hooks/
│   └── useStatistics.ts          # 統計データ取得 Hook
└── types/
    └── statistics.ts             # 統計型定義
```

---

### 3.3 UI/UX 改善

#### 3.3.1 概要

Phase 1 の UI を改善し、より直感的で美しいインターフェースを実現します。

#### 3.3.2 改善項目一覧

| 改善項目 | 詳細 | 優先度 |
|---------|------|--------|
| **レスポンシブ対応強化** | タブレット・デスクトップでのレイアウト最適化 | P0 |
| **アニメーション** | ページ遷移、ローディング状態 | P1 |
| **ダークモード** | ダークモード対応（オプション） | P2 |
| **アクセシビリティ** | WCAG 2.1 AA 準拠 | P1 |
| **フォント・タイポグラフィ** | 日本語フォント最適化 | P2 |
| **色彩設計** | デザインシステムの構築 | P2 |

#### 3.3.3 レスポンシブグリッド設計

```
【スマートフォン】(< 640px)
- 1カラムレイアウト
- フルスクリーン操作

【タブレット】(640px - 1024px)
- 2カラムレイアウト
- サイドバー + メインコンテンツ

【デスクトップ】(> 1024px)
- 3カラムレイアウト
- ナビゲーション + メイン + サイドパネル
```

#### 3.3.4 ローディング・スケルトン画面

```typescript
// 高速フィードバック用スケルトンコンポーネント
// src/components/common/Skeleton.tsx (既存)
// を複数箇所で活用

// 使用例:
const ReflectionHistoryLoading = () => (
  <>
    <Skeleton className="w-full h-12 mb-4" />
    <Skeleton className="w-full h-64 mb-4" />
    <Skeleton className="w-full h-12" count={3} />
  </>
);
```

#### 3.3.5 実装ファイル

```
src/
├── components/
│   ├── layout/
│   │   ├── ResponsiveGrid.tsx   # レスポンシブグリッド
│   │   └── SidebarLayout.tsx    # サイドバーレイアウト
│   ├── animations/
│   │   ├── FadeIn.tsx
│   │   ├── SlideIn.tsx
│   │   └── SkeletonLoader.tsx
│   └── common/
│       └── Loading.tsx           # 統一ローディング UI
├── styles/
│   ├── animations.css            # アニメーション定義
│   └── typography.css            # タイポグラフィ設定
└── hooks/
    └── useMediaQuery.ts          # メディアクエリ Hook
```

---

### 3.4 エラーハンドリング・監視

#### 3.4.1 概要

Phase 1 で実装した基本的なエラーハンドリングを強化し、エラーログの記録・分析機構を構築します。

#### 3.4.2 エラー分類体系

**すでに実装済み**（`src/utils/errorHandler.ts`）:
```typescript
enum ErrorType {
  NETWORK,           // ネットワーク接続エラー
  OFFLINE,           // オフライン状態
  VALIDATION,        // バリデーションエラー
  AUTHENTICATION,    // 認証エラー (401)
  AUTHORIZATION,     // 権限エラー (403)
  NOT_FOUND,         // リソース未検出 (404)
  SERVER,            // サーバーエラー (5xx)
  UNKNOWN,           // 不明なエラー
}
```

#### 3.4.3 エラーログ記録 & 分析

**新規実装**:

```typescript
interface ErrorLog {
  id: string;                      // UUID
  user_id: string;                 // FK: profiles.id
  error_type: ErrorType;
  error_message: string;
  error_stack?: string;
  context: {
    page: string;                  // 発生ページ
    action: string;                // 実行中のアクション
    user_agent?: string;
    timestamp: string;
  };
  resolved: boolean;               // ユーザーが解決したか
  resolution_method?: string;      // 解決方法
  created_at: string;
}

// エラー集計テーブル
interface ErrorMetrics {
  date: string;                    // 集計日
  total_errors: number;
  by_type: Record<ErrorType, number>;
  critical_errors: number;         // 人的対応が必要なエラー数
  resolution_rate: number;         // 解決率（%）
}
```

**実装ファイル**:
- `src/lib/errorTracking/client.ts` - フロントエンドエラー追跡
- `src/services/errorLoggingService.ts` - エラーログ送信ロジック
- `src/app/api/logs/errors/route.ts` - エラーログ受信 API

#### 3.4.4 自動回復機構

```typescript
// リトライロジック（既に実装済み）
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}
```

---

### 3.5 Web プッシュ通知基盤（Preview）

#### 3.5.1 概要

Phase 3 でのプッシュ通知実装に向け、基盤となるテーブル設計と API 仕様を先行実装します。

#### 3.5.2 Push Subscriptions テーブル設計

```typescript
interface PushSubscription {
  id: string;                      // UUID
  user_id: string;                 // FK: profiles.id
  endpoint: string;                // Push service endpoint (暗号化)
  p256dh: string;                  // Encryption key (暗号化)
  auth: string;                    // Auth secret (暗号化)
  user_agent: string;              // デバイス識別情報
  browser: string;                 // ブラウザ種別（Chrome, Firefox, Safari など）
  is_active: boolean;              // 有効フラグ
  created_at: string;
  updated_at: string;
}
```

#### 3.5.3 User Preferences テーブル設計

```typescript
interface UserPreferences {
  user_id: string;                 // PK, FK: profiles.id

  // UI設定
  pwa_install_dismissed: boolean;  // インストール案内を非表示にしたか
  dashboard_layout: "cards" | "compact" | "detailed";
  timezone: string;                // タイムゾーン (Asia/Tokyo など)

  // 将来的な通知設定（Phase 3 で有効化）
  notification_preferences: {
    push_enabled: boolean;         // プッシュ通知有効化
    reminder_time: string;         // "20:00" 形式
    reminder_frequency: "daily" | "weekdays" | "disabled";
    reminder_enabled: boolean;
  };

  // その他
  preferred_framework_id?: string; // デフォルトフレームワーク

  created_at: string;
  updated_at: string;
}
```

#### 3.5.4 実装ファイル

```
src/
├── app/
│   └── api/
│       └── push/
│           ├── subscribe/route.ts     # POST /api/push/subscribe
│           └── unsubscribe/route.ts   # POST /api/push/unsubscribe
├── lib/
│   └── push/
│       └── encryption.ts              # 暗号化・復号化ユーティリティ
├── types/
│   └── push.ts                        # Push 関連型定義
└── services/
    └── pushService.ts                 # Push Subscription 管理
```

**注記**: Push通知の実装は Phase 3 で行います。Phase 2 では基盤設計のみ。

---

## 4. 技術スタック・構成

### 4.1 新規ライブラリ（Phase 2 で追加）

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| **Web Crypto API** | Built-in | Push notification encryption |
| **framer-motion** | ^10.x | スムーズなアニメーション（オプション） |
| **react-window** | ^8.x | 大規模リスト仮想化（性能最適化） |
| **date-fns** | ^4.1.0 (既存) | 期間計算 |

### 4.2 既存スタック継続

- Next.js 15.5.2, React 19.1.0, TypeScript ^5
- Supabase, Zustand, React Query
- Tailwind CSS, shadcn/ui

---

## 5. API設計

### 5.1 新規エンドポイント

#### フレームワーク管理

```
GET /api/frameworks
  認証: Required
  出力: { frameworks: Framework[] }

GET /api/frameworks/:id
  認証: Required
  出力: { framework: Framework }

POST /api/frameworks
  認証: Required
  入力: { name, display_name, schema, ... }
  出力: { framework: Framework }

PUT /api/frameworks/:id
  認証: Required
  入力: { display_name, schema, ... }
  出力: { framework: Framework }

DELETE /api/frameworks/:id
  認証: Required
  出力: { success: boolean }
```

#### 統計分析

```
GET /api/analytics/summary
  認証: Required
  パラメータ: date_from?, date_to?
  出力: { summary: StatisticsData['summary'] }

GET /api/analytics/trends
  認証: Required
  パラメータ: period="weekly"|"monthly"
  出力: { trends: StatisticsData['trends'] }

GET /api/analytics/distribution
  認証: Required
  パラメータ: group_by="framework"|"day_of_week"
  出力: { distribution: StatisticsData['distribution'] }
```

#### 設定管理

```
GET /api/preferences
  認証: Required
  出力: { preferences: UserPreferences }

PUT /api/preferences
  認証: Required
  入力: { pwa_install_dismissed?, dashboard_layout?, timezone?, ... }
  出力: { preferences: UserPreferences }
```

#### エラーログ（Internal）

```
POST /api/logs/errors
  認証: Optional (クライアント側)
  入力: { error_log: ErrorLog }
  出力: { success: boolean }
```

---

## 6. データモデル拡張

### 6.1 新規テーブル: user_frameworks

```typescript
interface UserFramework {
  id: string;
  user_id: string;                 // FK: profiles.id
  framework_id: string;            // FK: frameworks.id
  is_favorite: boolean;
  usage_count: number;
  last_used: string;
  created_at: string;
  updated_at: string;
}
```

### 6.2 拡張テーブル: frameworks

**新規フィールド**:
```typescript
interface Framework {
  // ...既存フィールド
  usage_count: number;             // グローバル使用回数
  creator_id?: string;             // カスタムフレームワーク作成者
  is_public: boolean;              // 他ユーザーと共有可能か
}
```

### 6.3 新規テーブル: error_logs

```typescript
interface ErrorLog {
  id: string;
  user_id: string;                 // FK: profiles.id
  error_type: string;
  error_message: string;
  error_stack: string;
  context: JSONB;
  resolved: boolean;
  created_at: string;
}
```

### 6.4 新規テーブル: user_preferences

```typescript
interface UserPreferences {
  user_id: string;                 // PK
  pwa_install_dismissed: boolean;
  dashboard_layout: string;
  timezone: string;
  notification_preferences: JSONB;
  created_at: string;
  updated_at: string;
}
```

### 6.5 新規テーブル: push_subscriptions

```typescript
interface PushSubscription {
  id: string;
  user_id: string;                 // FK: profiles.id
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## 7. テスト戦略

### 7.1 テスト目標

| テストタイプ | 対象 | 目標カバレッジ |
|-----------|-----|------------|
| **ユニットテスト** | Services, Utils, Hooks | 70%+ |
| **統合テスト** | API Routes, Supabase | 60%+ |

### 7.2 主要テストケース

```typescript
// フレームワークサービステスト
describe('Framework Service', () => {
  test('should get all frameworks for user');
  test('should create custom framework');
  test('should validate framework schema');
  test('should update framework');
  test('should delete custom framework');
});

// 統計サービステスト
describe('Analytics Service', () => {
  test('should calculate KPI summary');
  test('should generate trend data');
  test('should calculate growth score');
});

// エラーハンドリングテスト
describe('Error Handling', () => {
  test('should log errors correctly');
  test('should classify error types');
  test('should retry failed operations');
});

// UI コンポーネントテスト
describe('Framework Builder Component', () => {
  test('should render field editor');
  test('should add/remove fields');
  test('should validate schema');
});
```

---

## 8. パフォーマンス・最適化

### 8.1 最適化施策

```typescript
// 大規模リスト表示時の仮想化
import { FixedSizeList as List } from 'react-window';

// Image lazy loading
<img loading="lazy" src="..." alt="..." />

// Code splitting for analytics
const AnalyticsDashboard = dynamic(() =>
  import('@/components/statistics/StatsDashboard'),
  { loading: () => <Skeleton /> }
);
```

### 8.2 キャッシング戦略

```typescript
// React Query でサーバーステート管理
const { data: statistics } = useQuery({
  queryKey: ['statistics', userId],
  queryFn: () => fetchStatistics(userId),
  staleTime: 5 * 60 * 1000, // 5分
  gcTime: 10 * 60 * 1000, // 10分
});
```

---

## 9. 実装スケジュール

### 9.1 Phase 2 タイムライン（16日間）

```
Week 1 (Day 1-8)
├─ Day 1-2: フレームワーク管理の強化
│  ├─ 追加フレームワークの実装
│  ├─ カスタムフレームワーク UI
│  └─ テスト
├─ Day 3-5: 統計・トレンド分析
│  ├─ データ集計ロジック
│  ├─ ダッシュボード UI
│  └─ テスト
└─ Day 6-8: UI/UX 改善
   ├─ レスポンシブ対応強化
   ├─ ローディングアニメーション
   └─ アクセシビリティ改善

Week 2 (Day 9-16)
├─ Day 9-10: エラーハンドリング強化
│  ├─ エラーログ記録機構
│  ├─ 監視ダッシュボード
│  └─ テスト
├─ Day 11-12: Web プッシュ基盤構築
│  ├─ テーブル設計・実装
│  ├─ API 設計
│  └─ 暗号化ロジック
├─ Day 13-15: テスト・最適化
│  ├─ テストカバレッジ 70%達成
│  ├─ パフォーマンス最適化
│  └─ セキュリティレビュー
└─ Day 16: リリース準備
   ├─ ドキュメント完成
   └─ 本番環境デプロイ
```

### 9.2 マイルストーン

| マイルストーン | 期日 | 成果物 |
|-------------|------|--------|
| **フレームワーク強化完成** | Day 2 | 複数フレームワーク対応 |
| **統計ダッシュボード完成** | Day 5 | KPI + グラフ表示 |
| **UI/UX 改善完成** | Day 8 | レスポンシブ + アニメーション |
| **エラーハンドリング強化完成** | Day 10 | エラーログ + 監視 |
| **Web プッシュ基盤完成** | Day 12 | テーブル + API 設計 |
| **テスト完了** | Day 15 | テストカバレッジ 70%+ |
| **Phase 2 リリース** | Day 16 | Production Deploy |

---

## 10. リスク管理

### 10.1 主要リスク

| リスク | 影響度 | 確度 | 対策 |
|--------|--------|------|------|
| **データ移行の複雑性** | Medium | Medium | 段階的な移行、バックアップ |
| **パフォーマンス低下** | Medium | Low | 継続的な最適化、監視 |
| **テストカバレッジ不足** | Medium | Medium | テスト駆動開発、必須チェックリスト |
| **ユーザーフィードバック不足** | Low | Low | ベータテスター募集 |

---

## 付録

### 参考リンク

- [Web Crypto API - MDN](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 更新履歴

| バージョン | 日付 | 更新内容 |
|----------|------|--------|
| 1.0 | 2025-11-18 | 初版作成 |

---

**ドキュメント作成者**: Claude Code Design Team
**最終レビュー日**: 2025-11-18
**次回レビュー予定**: 実装開始時
