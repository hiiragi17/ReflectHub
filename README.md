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

## 今後追加予定の機能

- PWA
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

## 環境変数

ローカル開発では `.env.example` をコピーして `.env.local` を作成し、各値を設定します。

```bash
cp .env.example .env.local
```

本番では Vercel Dashboard → Settings → Environment Variables に同じキーを登録し、変更後は **Redeploy** が必要です。

| 変数 | 用途 | 公開範囲 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | 公開 (クライアント) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 公開 (クライアント) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key。RLS をバイパスし Cron 等で使用 | **サーバー専用 (秘匿)** |
| `CRON_SECRET` | `/api/cron/*` を保護する Bearer トークン | サーバー専用 |
| `CSRF_SECRET` | CSRF トークンの HMAC 署名鍵 (16 文字以上) | サーバー専用 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID 公開鍵 | 公開 (クライアント) |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 秘密鍵 | サーバー専用 |
| `VAPID_SUBJECT` | Web Push の連絡先 (`mailto:` 等) | サーバー専用 |

詳細と取得方法は `.env.example` のコメントを参照してください。

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
│   ├── auth/              # 認証ページ
│   ├── dashboard/         # ダッシュボード
│   ├── history/           # 履歴ページ
│   ├── profile/           # プロフィールページ
│   └── reflection/        # 振り返り作成・編集
├── components/            # Reactコンポーネント
│   ├── auth/             # 認証関連
│   ├── layout/           # レイアウト
│   ├── profile/          # プロフィール
│   ├── reflection/       # 振り返り
│   ├── providers/        # コンテキストプロバイダー
│   └── ui/               # shadcn/uiコンポーネント
├── hooks/                # カスタムフック
├── lib/                  # ユーティリティ
├── services/             # ビジネスロジック
├── stores/               # Zustand ストア
├── types/                # TypeScript型定義
└── utils/                # ヘルパー関数
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
