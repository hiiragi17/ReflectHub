/**
 * GitHub Issue 自動登録スクリプト
 *
 * 使い方:
 *   GITHUB_TOKEN=<your-token> npx tsx scripts/create-issues.ts [--phase2] [--phase3] [--dry-run]
 *
 * オプション:
 *   --phase2    Phase 2 の Issue のみ作成
 *   --phase3    Phase 3 の Issue のみ作成
 *   --dry-run   実際には作成せず、作成予定の Issue を表示
 *   (オプションなし) Phase 2 と Phase 3 の両方を作成
 *
 * 環境変数:
 *   GITHUB_TOKEN  GitHub Personal Access Token (repo スコープが必要)
 */

const REPO_OWNER = "hiiragi17";
const REPO_NAME = "ReflectHub";
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

interface IssueDefinition {
  title: string;
  body: string;
  labels: string[];
  milestone?: string;
}

// ─── Phase 2 Issues ───────────────────────────────────────────

const phase2Issues: IssueDefinition[] = [
  {
    title:
      "[Phase 2.1] フレームワーク管理の強化 - 複数フレームワーク対応, カスタムフレームワーク",
    labels: ["Phase 2", "Framework", "enhancement"],
    body: `## 概要
YWT・KPT に加え、4L、STAR などの複数フレームワークに対応し、ユーザーがカスタムフレームワークを作成・管理できる機能を実装します。

## 実装内容
### Day 1-2: フレームワーク管理の強化

#### データモデル拡張
- [ ] \`frameworks\` テーブル拡張
  - \`created_by\`: ユーザーによるカスタムフレームワーク作成者
  - \`is_public\`: 他ユーザーと共有可能か
  - \`usage_count\`: 使用回数統計
  - \`last_used\`: 最終使用日時
- [ ] \`user_frameworks\` テーブル新規作成
  - ユーザーごとのフレームワーク選好設定

#### 新規フレームワークの実装
- [ ] **4L フレームワーク** (Liked / Learned / Lacked / Longed for)
- [ ] **STAR フレームワーク** (Situation / Task / Action / Result)
- [ ] **振り返り日記** (時間軸に沿った自由記述形式)

#### フレームワーク管理 UI
- [ ] フレームワーク選択画面の拡張 (\`src/components/reflection/FrameworkSelector.tsx\`)
- [ ] フレームワーク管理ページ (\`src/app/settings/frameworks/page.tsx\`)
- [ ] フレームワークビルダー (\`src/components/frameworks/FrameworkBuilder.tsx\`)

#### API エンドポイント
- [ ] \`GET /api/frameworks\` - フレームワーク一覧取得
- [ ] \`GET /api/frameworks/:id\` - フレームワーク詳細取得
- [ ] \`POST /api/frameworks\` - カスタムフレームワーク作成
- [ ] \`PUT /api/frameworks/:id\` - フレームワーク更新
- [ ] \`DELETE /api/frameworks/:id\` - フレームワーク削除（カスタムのみ）

#### ビジネスロジック拡張
- [ ] \`src/services/frameworkService.ts\` 拡張

## テスト
- [ ] フレームワーク作成・編集・削除テスト
- [ ] フレームワーク選択・切り替えテスト
- [ ] カスタムフレームワーク検証テスト

## チェックリスト
- [ ] 全新規フレームワーク実装完了
- [ ] カスタムフレームワーク作成機能完了
- [ ] フレームワーク管理 UI 完成
- [ ] API エンドポイント実装完了
- [ ] テスト実施（70%以上カバレッジ）
- [ ] コードレビュー完了

## 参考資料
- [設計書: フレームワーク管理の強化](PHASE2_DESIGN_DOCUMENT.md)`,
  },
  {
    title:
      "[Phase 2.2] 統計・トレンド分析実装 - KPI, グラフ, 成長スコア",
    labels: ["Phase 2", "Analytics", "Statistics", "enhancement"],
    body: `## 概要
振り返り履歴から統計データを自動計算し、ユーザーの成長を可視化します。

## 実装内容
### Day 3-5: 統計・トレンド分析

#### 統計計算ロジック
- [ ] \`src/services/analyticsService.ts\` 実装
  - 基本統計: 総数、今月数、連続日数、平均文字数
  - 頻度分析: 週ごと・月ごとの振り返し数
  - フレームワーク分析: 使用フレームワークの分布
  - 期間比較: 前月比・前週比
  - ストリーク計算: 連続日数、ベストストリーク
  - 成長スコア: 複合指標（0-100）

#### API エンドポイント
- [ ] \`GET /api/analytics/summary\` - KPI サマリー取得
- [ ] \`GET /api/analytics/trends\` - トレンドデータ取得（週次・月次）
- [ ] \`GET /api/analytics/distribution\` - 分布データ取得

#### ダッシュボード UI
- [ ] \`src/app/analytics/page.tsx\` - 統計ダッシュボード
- [ ] \`src/components/statistics/\`
  - StatsCard.tsx / TrendChart.tsx / FrameworkBreakdown.tsx
  - PeriodComparison.tsx / StreakDisplay.tsx / GrowthScore.tsx

#### グラフ・チャートライブラリ
- [ ] Recharts ライブラリ導入

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

## 参考資料
- [設計書: 統計・トレンド分析](PHASE2_DESIGN_DOCUMENT.md)`,
  },
  {
    title:
      "[Phase 2.3] UI/UX 改善 - レスポンシブ強化, アニメーション, アクセシビリティ",
    labels: ["Phase 2", "UI", "UX", "enhancement"],
    body: `## 概要
Phase 1 の UI を改善し、より直感的で美しいインターフェースを実現します。

## 実装内容
### Day 6-8: UI/UX 改善

#### レスポンシブ対応強化
- [ ] タブレット向けレイアウト最適化（2カラムレイアウト）
- [ ] デスクトップ向けレイアウト（3カラムレイアウト）
- [ ] \`src/components/layout/ResponsiveGrid.tsx\` 実装
- [ ] \`src/components/layout/SidebarLayout.tsx\` 実装
- [ ] \`src/hooks/useMediaQuery.ts\` 実装

#### アニメーション実装
- [ ] ページ遷移アニメーション
- [ ] ローディング状態アニメーション
- [ ] リスト表示アニメーション（フェードイン）
- [ ] \`src/components/animations/\` (FadeIn / SlideIn / SkeletonLoader)

#### アクセシビリティ改善
- [ ] WCAG 2.1 AA 準拠確認
- [ ] キーボードナビゲーション対応
- [ ] スクリーンリーダー対応
- [ ] 色コントラスト確認（4.5:1 以上）
- [ ] ARIA 属性適切な配置

#### ローディング状態
- [ ] 統一ローディング UI
- [ ] スケルトンコンポーネントの活用
- [ ] Suspense による遅延ローディング

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

## 参考資料
- [設計書: UI/UX 改善](PHASE2_DESIGN_DOCUMENT.md)`,
  },
  {
    title:
      "[Phase 2.4] エラーハンドリング強化 - エラーログ, 監視機構, 自動回復",
    labels: ["Phase 2", "Error Handling", "Logging", "enhancement"],
    body: `## 概要
Phase 1 で実装した基本的なエラーハンドリングを強化し、エラーログの記録・分析機構を構築します。

## 実装内容
### Day 9-10: エラーハンドリング強化

#### エラーログ記録システム
- [ ] error_logs テーブル設計・\`src/types/errorTracking.ts\` 型定義
- [ ] フロントエンド エラー追跡 (\`src/lib/errorTracking/client.ts\`)
- [ ] バックエンド エラーログ API
  - \`POST /api/logs/errors\` - エラーログ受信
  - \`GET /api/logs/errors\` - エラーログ一覧取得（管理者用）
- [ ] エラーログサービス (\`src/services/errorLoggingService.ts\`)

#### エラー集計・分析
- [ ] error_metrics テーブル設計
- [ ] 日ごとのエラー集計、タイプ別集計、解決率計算

#### 自動回復機構の強化
- [ ] リトライロジック改善（指数バックオフ: 1s → 2s → 4s）
- [ ] ネットワークエラー自動回復（\`src/hooks/useNetworkStatus.ts\` 活用）
- [ ] Graceful degradation（フォールバック UI）

#### エラーメッセージの改善
- [ ] ユーザーフレンドリーなメッセージ
- [ ] エラーメッセージのローカライズ（日本語）
- [ ] \`src/utils/errorHandler.ts\` 拡張

## テスト
- [ ] エラーログ記録テスト
- [ ] エラー送信 API テスト
- [ ] 自動回復ロジックテスト

## チェックリスト
- [ ] エラーログテーブル実装完了
- [ ] フロントエンド エラー追跡実装
- [ ] エラーログ API 実装完了
- [ ] 自動回復機構テスト確認
- [ ] エラーメッセージ改善完了
- [ ] テスト実施（70%以上カバレッジ）
- [ ] コードレビュー完了

## 参考資料
- [設計書: エラーハンドリング・監視](PHASE2_DESIGN_DOCUMENT.md)`,
  },
  {
    title:
      "[Phase 2.5] Web プッシュ基盤構築 & テスト体制確立 - データモデル, テストカバレッジ",
    labels: ["Phase 2", "Push Notification", "Testing", "enhancement"],
    body: `## 概要
Phase 3 での Web プッシュ通知実装に向け、基盤となるテーブル設計と API 仕様を先行実装します。同時にテスト体制を確立し、テストカバレッジ 70%以上を達成します。

## 実装内容
### Day 11-12: Web プッシュ基盤構築

#### Push Subscriptions テーブル設計
- [ ] \`src/types/push.ts\` - 型定義
- [ ] データベーステーブル作成 (id, user_id, endpoint, p256dh, auth, etc.)
- [ ] RLS ポリシー設定

#### User Preferences テーブル拡張
- [ ] \`user_preferences\` テーブル設計（Phase 3 用）

#### Push API エンドポイント設計
- [ ] \`POST /api/push/subscribe\`
- [ ] \`POST /api/push/unsubscribe\`
- [ ] \`GET /api/preferences\`
- [ ] \`PUT /api/preferences\`

#### セキュリティ対応
- [ ] Subscription Endpoint 暗号化 (\`src/lib/push/encryption.ts\`)

### Day 13-16: テスト体制確立

#### ユニットテスト拡張
- [ ] フレームワークサービス テスト
- [ ] 統計サービス テスト
- [ ] エラーハンドリング テスト
- [ ] UI コンポーネント テスト

#### 統合テスト
- [ ] API エンドポイント統合テスト
- [ ] Supabase 統合テスト

#### テストカバレッジ測定
- [ ] 目標: 70%以上
- [ ] CI/CD パイプラインにテスト組み込み

## チェックリスト
- [ ] Push Subscriptions テーブル実装
- [ ] User Preferences テーブル実装
- [ ] Push API エンドポイント設計完了
- [ ] 暗号化ロジック実装
- [ ] ユニットテスト実装（70%以上カバレッジ）
- [ ] 統合テスト実装
- [ ] 全テスト通過確認
- [ ] コードレビュー完了

## 参考資料
- [設計書: Web プッシュ通知基盤](PHASE2_DESIGN_DOCUMENT.md)`,
  },
];

// ─── Phase 3 Issues ───────────────────────────────────────────

const phase3Issues: IssueDefinition[] = [
  {
    title:
      "[Phase 3.1] PWA機能実装 - Web App Manifest, Service Worker, インストール UI",
    labels: ["Phase 3", "PWA", "enhancement"],
    body: `## 概要
ReflectHub を Progressive Web App（PWA）化し、ユーザーがインストール可能な状態にします。

## 実装内容
### Day 1-2: PWA基盤構築
- [ ] Web App Manifest ファイル作成 (\`public/manifest.json\`)
- [ ] Service Worker 実装 (\`public/sw.js\`)
  - キャッシュ戦略（SWR: Stale-While-Revalidate）
  - アセット キャッシング
  - ネットワーク フォールバック
- [ ] Service Worker 登録スクリプト (\`src/lib/sw/register.ts\`)
- [ ] アイコン生成（192x192, 256x256, 384x384, 512x512）
- [ ] インストール プロンプト コンポーネント (\`src/components/common/InstallPrompt.tsx\`)
- [ ] インストール状態管理 Hook (\`src/hooks/useInstallPrompt.ts\`)

## チェックリスト
- [ ] すべての実装完了
- [ ] Web App がインストール可能
- [ ] Service Worker がアクティブに動作
- [ ] Lighthouse スコア PWA: 90以上
- [ ] テスト実装
- [ ] コードレビュー完了

## 参考資料
- [設計書: PWA機能セクション](PHASE3_DESIGN_DOCUMENT.md)
- 関連 Issue: #39`,
  },
  {
    title:
      "[Phase 3.2] AI分析機能実装 - OpenAI API統合, 分析エンドポイント, UI",
    labels: ["Phase 3", "AI", "OpenAI", "enhancement"],
    body: `## 概要
OpenAI API を統合し、ユーザーの振り返り内容から自動的にインサイトを生成します。

## 実装内容
### Day 3-4: AI分析機能
- [ ] OpenAI API クライアント実装 (\`src/lib/openai/client.ts\`)
- [ ] AI分析エンドポイント (\`src/app/api/ai/analyze/route.ts\`)
  - POST /api/ai/analyze
  - 認証検証・入力値検証
  - レート制限実装（1日3回）
  - 分析結果をDB保存
- [ ] AI分析ビジネスロジック (\`src/services/aiAnalysisService.ts\`)
- [ ] 分析結果UI (\`src/components/analysis/\`)
  - AnalysisPanel.tsx / InsightCard.tsx / RecommendationList.tsx / EmotionalTrend.tsx
- [ ] 分析カスタムフック (\`src/hooks/useAIAnalysis.ts\`)
- [ ] 型定義 (\`src/types/analysis.ts\`)
- [ ] エラーハンドリング強化（リトライロジック）

## チェックリスト
- [ ] OpenAI API 統合完了
- [ ] 分析エンドポイント実装完了
- [ ] UI 表示完了
- [ ] レート制限機能実装
- [ ] エラーハンドリング完了
- [ ] テスト実装（API テスト、モック OpenAI）
- [ ] コードレビュー完了

## 参考資料
- [設計書: AI分析機能セクション](PHASE3_DESIGN_DOCUMENT.md)
- 関連 Issue: #39`,
  },
  {
    title:
      "[Phase 3.3] 統計ダッシュボード実装 - KPI, チャート, アクティビティトレンド",
    labels: ["Phase 3", "Analytics", "Charts", "enhancement"],
    body: `## 概要
ユーザーの振り返り履歴から統計データを自動計算し、成長の可視化を提供します。

## 実装内容
### Day 5-6: 統計ダッシュボード
- [ ] 統計データ集計ロジック (\`src/services/analyticsService.ts\`)
- [ ] 統計API エンドポイント (\`src/app/api/analytics/\`)
  - GET /api/analytics/summary
  - GET /api/analytics/trends
  - GET /api/analytics/distribution
- [ ] Recharts ライブラリ統合
- [ ] KPI カード コンポーネント (\`src/components/analytics/StatsOverview.tsx\`)
- [ ] グラフ・チャート実装 (\`src/components/analytics/\`)
  - ReflectionFrequency.tsx / FrameworkDistribution.tsx
  - EmotionalTrend.tsx / ActivityHeatmap.tsx / GrowthTrendChart.tsx
- [ ] ダッシュボードページ (\`src/app/analytics/page.tsx\`)
- [ ] カスタムフック (\`src/hooks/useAnalytics.ts\`)

## チェックリスト
- [ ] 統計集計ロジック完了
- [ ] API エンドポイント実装完了
- [ ] Recharts 統合完了
- [ ] 全チャート表示完了
- [ ] テスト実装
- [ ] レスポンシブ対応完了
- [ ] コードレビュー完了

## 参考資料
- [設計書: 統計ダッシュボード](PHASE3_DESIGN_DOCUMENT.md)
- 関連 Issue: #39`,
  },
  {
    title:
      "[Phase 3.4] Web プッシュ通知 & セキュリティ・テスト - 通知機能, CSRF対策, テスト体制",
    labels: [
      "Phase 3",
      "Push Notification",
      "Security",
      "Testing",
      "enhancement",
    ],
    body: `## 概要
Web Push API を活用した日次リマインダー機能を実装し、セキュリティ対策とテスト体制を完成させます。

## 実装内容
### Day 7: Web プッシュ通知 Phase 1
- [ ] Web Push API 統合 (\`src/lib/push/client.ts\`)
- [ ] 通知許可プロンプト UI (\`src/components/common/PushNotificationPrompt.tsx\`)
- [ ] Push Subscription 管理 API

### Day 8-9: Web プッシュ通知 Phase 2
- [ ] リマインダー スケジューリング (\`src/services/reminderService.ts\`)
- [ ] バックエンド Job 実装（Vercel Cron ジョブ）
- [ ] リマインダー設定管理 API

### Day 10-11: セキュリティ強化
- [ ] CSRF対策実装
- [ ] 入力検証強化（zod/yup）
- [ ] OpenAI プロンプトインジェクション対策

### Day 12-13: テスト
- [ ] Web プッシュテスト
- [ ] AI分析テスト
- [ ] 統計機能テスト
- [ ] セキュリティテスト
- [ ] テストカバレッジ 80%以上達成

### Day 14: 本番準備・リリース
- [ ] Core Web Vitals 最適化 (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] パフォーマンステスト
- [ ] セキュリティレビュー完了
- [ ] 本番環境デプロイ

## チェックリスト
- [ ] Web Push API 統合完了
- [ ] リマインダー送信機能完了
- [ ] CSRF対策実装完了
- [ ] 入力検証強化完了
- [ ] テストカバレッジ 80%以上達成
- [ ] セキュリティレビュー完了
- [ ] Core Web Vitals 達成
- [ ] 本番環境デプロイ完了

## 参考資料
- [設計書: Web プッシュ通知機能](PHASE3_DESIGN_DOCUMENT.md)
- 関連 Issue: #39`,
  },
];

// ─── GitHub API ヘルパー ──────────────────────────────────────

async function githubFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN 環境変数が設定されていません。\n" +
        "使用例: GITHUB_TOKEN=ghp_xxx npx tsx scripts/create-issues.ts"
    );
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return res;
}

async function ensureLabelsExist(labels: string[]): Promise<void> {
  const uniqueLabels = [...new Set(labels)];

  for (const label of uniqueLabels) {
    const res = await githubFetch(
      `/labels/${encodeURIComponent(label)}`
    );
    if (res.status === 404) {
      console.log(`  ラベル "${label}" を作成中...`);
      const createRes = await githubFetch("/labels", {
        method: "POST",
        body: JSON.stringify({
          name: label,
          color: getLabelColor(label),
        }),
      });
      if (!createRes.ok) {
        const errorBody = await createRes.text();
        console.warn(
          `  ⚠ ラベル "${label}" の作成に失敗: ${createRes.status} ${errorBody}`
        );
      }
    }
  }
}

function getLabelColor(label: string): string {
  const colors: Record<string, string> = {
    "Phase 2": "0075ca",
    "Phase 3": "7057ff",
    enhancement: "a2eeef",
    Framework: "d876e3",
    Analytics: "0e8a16",
    Statistics: "006b75",
    UI: "e4e669",
    UX: "fbca04",
    "Error Handling": "d93f0b",
    Logging: "f9d0c4",
    "Push Notification": "1d76db",
    Testing: "bfd4f2",
    PWA: "5319e7",
    AI: "b60205",
    OpenAI: "c5def5",
    Charts: "0e8a16",
    Security: "d93f0b",
  };
  return colors[label] || "ededed";
}

async function createIssue(
  issue: IssueDefinition,
  index: number,
  total: number
): Promise<void> {
  console.log(`\n[${index + 1}/${total}] 作成中: ${issue.title}`);

  const res = await githubFetch("/issues", {
    method: "POST",
    body: JSON.stringify({
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`  ✗ 失敗: ${res.status} ${errorBody}`);
    return;
  }

  const data = (await res.json()) as { number: number; html_url: string };
  console.log(`  ✓ 作成完了: #${data.number} ${data.html_url}`);
}

// ─── メイン処理 ──────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const phase2Only = args.includes("--phase2");
  const phase3Only = args.includes("--phase3");

  const issuesToCreate: IssueDefinition[] = [];

  if (!phase2Only && !phase3Only) {
    issuesToCreate.push(...phase2Issues, ...phase3Issues);
  } else {
    if (phase2Only) issuesToCreate.push(...phase2Issues);
    if (phase3Only) issuesToCreate.push(...phase3Issues);
  }

  console.log("=".repeat(60));
  console.log("ReflectHub - GitHub Issue 自動登録スクリプト");
  console.log("=".repeat(60));
  console.log(`対象: ${issuesToCreate.length} 件の Issue`);
  if (dryRun) {
    console.log("モード: ドライラン（実際には作成しません）");
  }
  console.log("");

  if (dryRun) {
    issuesToCreate.forEach((issue, i) => {
      console.log(`[${i + 1}] ${issue.title}`);
      console.log(`    ラベル: ${issue.labels.join(", ")}`);
      console.log("");
    });
    console.log("ドライラン完了。実際に作成するには --dry-run を外してください。");
    return;
  }

  // ラベルの事前作成
  const allLabels = issuesToCreate.flatMap((i) => i.labels);
  console.log("ラベルの確認・作成中...");
  await ensureLabelsExist(allLabels);

  // Issue の作成
  for (let i = 0; i < issuesToCreate.length; i++) {
    await createIssue(issuesToCreate[i], i, issuesToCreate.length);
    // レート制限対策: 1秒待機
    if (i < issuesToCreate.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("完了！すべての Issue が作成されました。");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("エラーが発生しました:", err);
  process.exit(1);
});
