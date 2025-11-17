# GitHub Issue テンプレート - LINE連携実装 Phase 2

このディレクトリには、ReflectHub プロジェクトの **LINE連携実装 (Phase 2)** に関するすべてのGitHubissueテンプレートが含まれています。

## 📚 ドキュメント一覧

### 1. Epic - 全体計画

**ファイル**: `ISSUE_EPIC_LINE_INTEGRATION.md`

LINE連携実装プロジェクト全体の概要、目標、スコープ、アーキテクチャ、成功基準をまとめた Epic。すべてのサブタスクの親となります。

**内容**:
- プロジェクト全体目標
- アーキテクチャ図
- スケジュール（Day 8-11）
- 成功基準
- 参考リソース

---

### 2. Task 4.1 - LINE Developers環境構築

**ファイル**: `ISSUE_4_1_LINE_SETUP.md`

LINE Developers アカウント、プロバイダー、Messaging APIチャネル、LINE Loginチャネルを作成し、認証情報を取得する初期セットアップタスク。

**内容**:
- LINE Developersアカウント準備（30分）
- Messaging APIチャネルセットアップ（45分）
- LINE Loginチャネルセットアップ（30分）
- 環境変数ファイル整備（15分）

**完了条件**: `.env.local` に4つの認証情報が設定されている

---

### 3. Task 4.2 - 開発環境セットアップ

**ファイル**: `ISSUE_4_2_DEV_SETUP.md`

プロジェクトに必要なパッケージをインストールし、ディレクトリ構造を準備し、LINE SDK クライアントを初期化する。

**内容**:
- パッケージインストール（20分）
- ディレクトリ構造準備（30分）
- LINE SDK基本設定実装（30分）
- Webhook基盤実装（40分）

**完了条件**: ローカルで `npm run dev` が成功し、TypeScriptエラーがない

---

### 4. Task 4.3 - LINE Login認証フロー

**ファイル**: `ISSUE_4_3_LINE_LOGIN.md`

LINE Loginボタンコンポーネントを実装し、OAuth2.1認証フローを構築。ユーザーがLINEアカウントで安全にログインできるようにする。

**内容**:
- ログインボタンコンポーネント実装（45分）
- OAuth2 Callbackエンドポイント実装（90分）
- ユーザープロフィール管理実装（45分）

**完了条件**: LINE ログイン画面が表示され、認証が完了する

---

### 5. Task 4.4 & 4.5 - Webhookイベント処理 + メッセージ送信機能

**ファイル**: `ISSUE_4_4_WEBHOOK_AND_4_5_MESSAGING.md`

LINE Webhookイベントを受信・処理し、メッセージ送信機能を構築。ユーザーからのメッセージに対応してリプライメッセージやプッシュメッセージを送信できるようにする。

**内容**:

#### Task 4.4 (2時間):
- イベント処理メインハンドラ実装
- メッセージ・フォロー・ポストバックイベント処理
- キーワード応答ロジック

#### Task 4.5 (4時間):
- メッセージング管理サービス実装
- メッセージテンプレート実装
- Push/Reply/Multicastメッセージ送信

**完了条件**: ngrok で Webhook テストが成功し、メッセージ送受信ができる

---

### 6. Task 4.6 & 4.7 - リッチメニュー + リマインダー基盤

**ファイル**: `ISSUE_4_6_RICH_MENU_AND_4_7_REMINDER.md`

LINEリッチメニュー（ボタンメニュー）を実装し、定期的なリマインダー機能を構築。ユーザーが簡単に主要機能にアクセスでき、定期的な振り返りリマインダーを受け取れるようにする。

**内容**:

#### Task 4.6 (4時間):
- リッチメニュー設計（2×3グリッド）
- リッチメニュー画像作成
- API実装
- セットアップスクリプト

#### Task 4.7 (4時間):
- リマインダー設定UI実装
- API エンドポイント実装
- Vercel Cron 設定
- 定期実行リマインダーエンドポイント

**完了条件**: LINE でメニューが表示され、Cron実行でリマインダーが送信される

---

## 🚀 GitHub Issue 作成方法

各ドキュメントをGitHubのissueとして作成するには：

### ステップ1: Issueを開く
1. GitHub リポジトリを開く
2. **Issues** タブをクリック
3. **New Issue** をクリック

### ステップ2: テンプレートをコピー
1. 対応するMarkdownファイルを開く
2. 全テキストをコピー（Ctrl+A, Ctrl+C）

### ステップ3: Issueに貼り付け
1. GitHub の Issue 作成ページに貼り付け（Ctrl+V）
2. タイトル、説明が正しく表示されることを確認
3. **Labels** を設定（推奨）
4. **Epic** リンク設定（サブタスク用）
5. **Submit new issue** をクリック

---

## 📋 推奨作成順序

LINE連携実装は以下の順序で実装することを推奨します：

```
Day 8:
  ├─ [Epic] LINE連携実装 フェーズ2
  ├─ Task 4.1: LINE Developers環境構築
  └─ Task 4.2: 開発環境セットアップ

Day 9:
  ├─ Task 4.3: LINE Login認証フロー
  └─ Task 4.4: Webhookイベント処理

Day 10:
  └─ Task 4.5: メッセージ送信機能

Day 11:
  ├─ Task 4.6: リッチメニュー実装
  └─ Task 4.7: リマインダー基盤実装
```

**推奨**: 各 Day の最初に Epic をリンク設定してください。

---

## 🏷️ GitHub Labels 推奨設定

各issueに以下のラベルを設定することを推奨します：

| Label | 説明 |
|-------|------|
| `line-integration` | LINE連携関連 |
| `enhancement` | 新機能追加 |
| `backend` | バックエンド作業 |
| `frontend` | フロントエンド作業 |
| `auth` | 認証関連 |
| `messaging` | メッセージング関連 |
| `setup` | セットアップ・環境構築 |
| `day-8`, `day-9`, etc | 実装予定日 |
| `epic` | Epic タスク |
| `high-priority` | 優先度高 |

---

## 📊 マイルストーン設定

推奨マイルストーン：

```
Milestone: Phase 2 - LINE Integration

Target Date: 2025-12-02
Description: LINE Messaging API, OAuth2 Login, Webhooks, Rich Menu, Reminders
```

---

## 🔗 関連ドキュメント

- **詳細設計書**: [`LINE_INTEGRATION_DESIGN.md`](../LINE_INTEGRATION_DESIGN.md)
  - アーキテクチャ
  - API仕様
  - データベース設計
  - セキュリティ考慮
  - テスト計画

---

## ✅ チェックリスト（Issue作成用）

Issue 作成時に以下をチェック：

```
[ ] タイトルが正確
[ ] 説明が完全
[ ] Estimated time が設定されている
[ ] Depends On が設定されている（必要な場合）
[ ] Labels が設定されている
[ ] Assignee が設定されている
[ ] Epic リンクが設定されている（Epic除く）
[ ] Milestone が設定されている
```

---

## 💡 Tips

### Markdownが崩れた場合

- GitHub の Issue エディタで Markdown プレビューを確認
- コードブロック（```）が正しく閉じられているか確認
- テーブル（|）の形式が正しいか確認

### 大型タスクの分割

4.4 と 4.5、4.6 と 4.7 は1つのissueにまとめられています。
必要に応じて分割してください：

```
分割例:
- Task 4.4a: Webhook イベント処理基盤
- Task 4.4b: イベント処理ロジック実装
- Task 4.5a: メッセージング管理サービス
- Task 4.5b: メッセージテンプレート実装
```

---

## 📞 サポート

実装中に問題が生じた場合：

1. 詳細設計書 [`LINE_INTEGRATION_DESIGN.md`](../LINE_INTEGRATION_DESIGN.md) を確認
2. 参考リソースのLINE公式ドキュメントを確認
3. Issue コメントで質問を記載

---

## 📄 License

このドキュメントはプロジェクト内部用です。

---

**Last Updated**: 2025-11-17
**Status**: Ready for Implementation
**Total Estimated Time**: 23 hours
