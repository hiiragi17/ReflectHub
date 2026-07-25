# ReflectHub

振り返りフレームワーク（YWT・KPT）を使った振り返り記録アプリケーション

https://reflecthub.vercel.app/

<img width="500" height="300" alt="OGP" src="https://github.com/user-attachments/assets/459489ae-ca95-4b8c-9966-2d8ddec20bc9" />


## 概要

ReflectHubは、週次の振り返りを簡単に記録・管理できるWebアプリケーションです。YWT（やったこと・わかったこと・次にやること）やKPT（Keep・Problem・Try）などの振り返りフレームワークを使って、継続的な成長を支援します。

## 主な機能

### 🔐 認証機能
- Google / LINE アカウントでのログイン
- セッション管理とサーバーサイド認証
- プロフィール編集機能

### 📝 振り返り機能
- YWT・KPTフレームワークでの振り返り作成
- リアルタイム保存
- タグ・気分の記録
- 振り返り期間の設定

### 📅 履歴管理
- カレンダー表示での振り返り確認
- 振り返り詳細の閲覧・編集・削除
- 日本標準時（JST）でのタイムゾーン管理

### 👤 プロフィール管理
- ユーザー名の表示・編集
- ダッシュボードからの設定画面遷移

### 📱 PWA（ホーム画面へのインストール）
- Web App Manifest によるスタンドアロン起動（ホーム画面/アプリ一覧から起動可能）
- Service Worker によるオフライン対応
  - 静的アセットは Stale-While-Revalidate でキャッシュ
  - HTML ナビゲーションは Network-First（オフライン時のみキャッシュへフォールバック）
  - API・外部 POST は常にネットワーク経由
- インストール導線（`beforeinstallprompt` を利用したインストールプロンプト）

### 🔔 週次リマインダー通知
- Web Push による振り返りリマインダー
- プロフィールの通知設定から、**配信曜日（日〜土 / OFF）と配信時刻（0:00〜23:00、日本時間）** を選択
- 複数端末で通知を ON にしている場合は「最後に ON にした端末」1 台にのみ配信
  （購読が失効していた場合は次の端末へフォールバック）
- 同日中の重複通知を防止（`last_notified_at`）
- 配信基盤は Supabase pg_cron + pg_net が毎時 0 分に
  `/api/cron/weekly-reminder` を起動し、対象ユーザーの判定はアプリ側で行う
  （セットアップ手順は [`database/README.md`](./database/README.md) を参照）

## 今後追加予定の機能

- AIによる分析

## 技術スタック

### フロントエンド
- **Next.js 15** - Reactフレームワーク
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - ユーティリティファーストCSS
- **shadcn/ui** - UIコンポーネントライブラリ
- **Zustand** - 状態管理

### バックエンド
- **Supabase** - 認証・データベース
- **Next.js API Routes** - サーバーサイドAPI
- **Supabase pg_cron / pg_net** - リマインダー配信のスケジューラ（毎時 0 分に起動）

### PWA / 通知
- **Web App Manifest + Service Worker** - インストール対応・オフラインキャッシュ
- **Web Push (VAPID)** - 週次リマインダーの配信

## テスト

**使用技術:**
- **Vitest** - ユニットテスト
- **React Testing Library** - コンポーネントテスト
- 包括的なテストカバレッジ（コンポーネント、ページ、APIルート）

## プロジェクト構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # APIルート
│   │   ├── cron/          # リマインダー配信 (weekly-reminder)
│   │   ├── preferences/   # 通知設定 (配信曜日・時刻)
│   │   └── push/          # プッシュ購読の登録・解除
│   ├── auth/              # 認証ページ
│   ├── dashboard/         # ダッシュボード
│   ├── history/           # 履歴ページ
│   ├── profile/           # プロフィールページ
│   └── reflection/        # 振り返り作成・編集
├── components/            # Reactコンポーネント
│   ├── auth/             # 認証関連
│   ├── common/           # 共通 (インストールプロンプト等)
│   ├── layout/           # レイアウト
│   ├── profile/          # プロフィール・通知設定
│   ├── reflection/       # 振り返り
│   ├── providers/        # コンテキストプロバイダー
│   └── ui/               # shadcn/uiコンポーネント
├── hooks/                # カスタムフック
├── lib/                  # ユーティリティ
│   ├── push/             # プッシュ購読・設定バリデーション
│   └── sw/               # Service Worker 登録
├── services/             # ビジネスロジック (リマインダー配信判定・Web Push 送信)
├── stores/               # Zustand ストア
├── types/                # TypeScript型定義
└── utils/                # ヘルパー関数

public/
├── manifest.json          # Web App Manifest
└── sw.js                  # Service Worker (キャッシュ + プッシュ通知)

database/                  # Supabase マイグレーション SQL (手順は database/README.md)
```

## コーディング規約

### スタイルガイド
- TypeScript strictモード
- ESLint + Prettier
- shadcn/ui コンポーネントパターン

## 主な画面

### ダッシュボード (`/dashboard`)
- クイックアクション（新規振り返り、履歴、統計、設定）
- 振り返りフレームワークの選択

### 振り返り作成 (`/reflection`)
- YWT / KPT フレームワークでの入力
- 自動保存機能
- タグ・気分・期間の設定

### 履歴 (`/history`)
- カレンダー表示
- 振り返り一覧
- 詳細表示・編集・削除

### プロフィール (`/profile`)
- ユーザー名の表示・編集
- アカウント情報の確認
- 通知設定：リマインダーの配信曜日（日〜土 / OFF）と配信時刻（0:00〜23:00、日本時間）の選択
