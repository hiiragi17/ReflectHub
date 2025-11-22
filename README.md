# ReflectHub

振り返りフレームワーク（YWT・KPT）を使った振り返り記録アプリケーション

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

### テスト
- **Vitest** - ユニットテスト
- **React Testing Library** - コンポーネントテスト
- 包括的なテストカバレッジ（コンポーネント、ページ、APIルート）

## セットアップ

### 必要な環境
- Node.js 18.x 以上
- npm / yarn / pnpm

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
```

### 環境変数

`.env.local` に以下の環境変数を設定してください：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# LINE Bot（オプション）
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

### ビルド

```bash
npm run build
npm run start
```

## テスト

```bash
# すべてのテストを実行
npm test

# 特定のファイルのテストを実行
npm test -- src/components/profile/ProfileCard.test.tsx

# カバレッジレポートの生成
npm run test:coverage
```

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

### コミットメッセージ
```
feat: 新機能
fix: バグ修正
refactor: リファクタリング
test: テスト追加・修正
docs: ドキュメント更新
chore: その他の変更
```

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

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

Created with ❤️ using Next.js and Supabase
