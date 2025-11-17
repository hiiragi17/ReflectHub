# LINE連携実装 - 実装ガイド＆サマリー

**作成日**: 2025-11-17
**Phase**: Phase 2 - LINE連携実装
**総時間**: 約23時間
**ステータス**: ✅ 詳細設計完了、実装準備完了

---

## 📌 概要

ReflectHub に LINE 連携機能を完全に実装するためのガイドドキュメント一式です。

### 実装概要
- **LINE Messaging API**: ユーザーとのテキスト・メッセージ送受信
- **LINE Login**: LINE アカウントでの認証
- **Rich Menu**: LINE上のボタンメニュー
- **リマインダー**: 定期的な振り返りプッシュ通知

---

## 📂 ドキュメント構成

```
docs/
├── LINE_INTEGRATION_DESIGN.md        ← 全体設計書（最初に読むべき）
│
├── issues/
│   ├── README.md                     ← Issue作成ガイド
│   ├── ISSUE_EPIC_LINE_INTEGRATION.md
│   ├── ISSUE_4_1_LINE_SETUP.md
│   ├── ISSUE_4_2_DEV_SETUP.md
│   ├── ISSUE_4_3_LINE_LOGIN.md
│   ├── ISSUE_4_4_WEBHOOK_AND_4_5_MESSAGING.md
│   └── ISSUE_4_6_RICH_MENU_AND_4_7_REMINDER.md
│
└── IMPLEMENTATION_SUMMARY.md         ← このファイル
```

---

## 🎯 クイックスタート

### 1️⃣ 設計を理解する（15分）

**ファイル**: [`LINE_INTEGRATION_DESIGN.md`](./LINE_INTEGRATION_DESIGN.md)

- アーキテクチャ図を確認
- データベース設計を確認
- API仕様を確認
- セキュリティ考慮を確認

### 2️⃣ GitHub Issues を作成（20分）

**ファイル**: [`issues/README.md`](./issues/README.md)

1. [Epic] LINE連携実装 を作成
2. Task 4.1～4.7 を順番に作成
3. ラベル、マイルストーン、依存関係を設定

### 3️⃣ 実装を開始（23時間）

**Day 8: LINE環境構築**
- Task 4.1: LINE Developers環境構築（2時間）
- Task 4.2: 開発環境セットアップ（2時間）

**Day 9: LINE認証＆Webhook**
- Task 4.3: LINE Login認証フロー（3時間）
- Task 4.4: Webhookイベント処理（2時間）

**Day 10: メッセージング**
- Task 4.5: メッセージ送信機能（4時間）

**Day 11: UI＆自動化**
- Task 4.6: リッチメニュー実装（4時間）
- Task 4.7: リマインダー基盤実装（4時間）

---

## 📋 主要ファイル概要

### 🔧 設定・認証ファイル

| ファイル | 用途 | サイズ |
|---------|------|--------|
| `src/lib/line/client.ts` | LINE Bot SDK初期化 | ~50行 |
| `src/lib/line/validator.ts` | Webhook署名検証 | ~40行 |
| `src/lib/line/auth.ts` | OAuth2処理、ユーザー同期 | ~150行 |

### 🌐 API エンドポイント

| エンドポイント | メソッド | 用途 | 実装時間 |
|-------------|--------|------|--------|
| `/api/line/webhook` | POST | Webhook受信 | 30分 |
| `/api/auth/line/callback` | GET | OAuth2 Callback | 60分 |
| `/api/settings/reminder` | GET/POST | リマインダー設定 | 40分 |
| `/api/cron/reminders` | GET | 定期実行リマインダー | 50分 |

### 🎨 コンポーネント

| ファイル | 用途 | 実装時間 |
|---------|------|--------|
| `src/components/auth/LineLoginButton.tsx` | ログインボタン | 30分 |
| `src/components/settings/ReminderSettings.tsx` | リマインダー設定UI | 45分 |

### 📨 メッセージング

| ファイル | 用途 | 実装時間 |
|---------|------|--------|
| `src/lib/line/messaging.ts` | メッセージ送信サービス | 40分 |
| `src/templates/lineMessages.ts` | メッセージテンプレート | 30分 |
| `src/lib/line/webhook.ts` | イベント処理 | 60分 |

### 🎯 特殊機能

| ファイル | 用途 | 実装時間 |
|---------|------|--------|
| `src/lib/line/richMenu.ts` | リッチメニュー管理 | 45分 |
| `scripts/setupRichMenu.ts` | セットアップスクリプト | 30分 |

---

## 🔐 セキュリティチェックリスト

```
[ ] Webhook署名検証が実装されている
[ ] CSRF対策（State検証）が実装されている
[ ] アクセストークンがサーバーサイド環境変数に保存されている
[ ] Channel Secret が非公開である
[ ] エラー詳細がクライアントに返されていない
[ ] SSL/HTTPS が本番で有効である
[ ] ID Token の署名検証が実装されている（推奨）
[ ] レート制限が設定されている
```

---

## 🧪 テスト計画

### ユニットテスト
```bash
npm test -- lib/line
```

**対象**:
- Webhook署名検証
- メッセージテンプレート生成
- ユーザー同期ロジック

### 統合テスト
```bash
npm test -- api/line
```

**対象**:
- Webhook エンドポイント
- OAuth2 フロー
- API エンドポイント

### E2E テスト（ngrok使用）
```bash
npm run dev
ngrok http 3000
# LINE DevelopersコンソールでWebhook URLを設定
# LINEアプリからテスト
```

**テストシナリオ**:
1. LINE ログイン
2. メッセージ送受信
3. リマインダー設定
4. リマインダー送信確認

---

## 📊 データベース変更

### 既存テーブル拡張: `profiles`

```sql
ALTER TABLE profiles ADD COLUMN (
  line_user_id VARCHAR(255) UNIQUE,
  line_follow_status VARCHAR(50) DEFAULT 'unknown',
  line_display_name VARCHAR(255),
  line_picture_url TEXT,
  provider VARCHAR(50) DEFAULT 'email'
);
```

### 新規テーブル: `user_settings`

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),

  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '18:00:00',
  reminder_days INTEGER[] DEFAULT ARRAY[5],
  reminder_timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
  reminder_framework VARCHAR(50) DEFAULT 'ywt',

  line_notifications_enabled BOOLEAN DEFAULT true,
  line_message_type VARCHAR(50) DEFAULT 'flex'
);
```

### 新規テーブル: `line_message_logs`

```sql
CREATE TABLE line_message_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ
);
```

---

## 🚀 デプロイメント手順

### ステージング環境

```bash
# 1. マイグレーション実行
npx supabase migration up

# 2. 環境変数設定
# Vercel Dashboard → Settings → Environment Variables
# LINE_CHANNEL_ACCESS_TOKEN=...
# LINE_CHANNEL_SECRET=...
# ...

# 3. デプロイ
git push origin development

# 4. Webhook URL設定
# LINE Developers → Messaging API → Webhook URL
# https://reflecthub-staging.vercel.app/api/line/webhook

# 5. テスト実行
npm run test
npm run build
```

### 本番環境

```bash
# ステージングで十分なテスト実行後
git push origin main

# LINE側チャネル設定更新
# Webhook URL: https://reflecthub.vercel.app/api/line/webhook
# Cron設定確認: vercel.json
```

---

## 🔍 実装前チェックリスト

### LINE Developers準備
```
[ ] LINE Developersアカウント作成済み
[ ] プロバイダー「ReflectHub」作成済み
[ ] Messaging APIチャネル作成済み
[ ] LINE Loginチャネル作成済み
[ ] 全認証情報を取得済み
[ ] コールバックURLを設定済み
```

### プロジェクト準備
```
[ ] .env.local ファイル作成済み
[ ] 全環境変数を設定済み
[ ] npm install 完了
[ ] npm run build 成功
[ ] npm run dev で起動確認
```

### デザイン準備
```
[ ] リッチメニュー画像作成済み（1040×1040px）
[ ] public/rich-menu.jpg に配置
```

---

## 📞 トラブルシューティング

### エラー: LINE_CHANNEL_SECRET is not set

**原因**: 環境変数未設定

**解決法**:
```bash
# .env.local を確認
cat .env.local | grep LINE_

# 足りない場合は追加して npm run dev を再実行
```

### エラー: Invalid signature

**原因**: Webhook署名検証失敗

**解決法**:
1. LINE Developers で Channel Secret を確認
2. .env.local の LINE_CHANNEL_SECRET が一致するか確認
3. ngrok でテストする場合、Webhook URL が正確か確認

### Webhook が届かない

**原因**: いくつかの可能性がある

**解決法**:
1. `npm run dev` でアプリが起動しているか確認
2. `ngrok http 3000` でトンネルが起動しているか確認
3. LINE Developers で Webhook URL が正確に設定されているか確認
4. ローカルファイアウォール設定を確認
5. ngrok ログで接続を確認

---

## 📚 参考リソース

### 公式ドキュメント
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [LINE Login](https://developers.line.biz/ja/docs/line-login/)
- [LINE Bot SDK (Node.js)](https://github.com/line/line-bot-sdk-nodejs)

### 実装パターン
- [Webhook 署名検証](https://developers.line.biz/ja/docs/messaging-api/receiving-messages/#webhook-signature)
- [Rich Menu](https://developers.line.biz/ja/docs/messaging-api/using-rich-menu/)
- [Flex Message](https://developers.line.biz/ja/docs/messaging-api/using-flex-message/)
- [Quick Reply](https://developers.line.biz/ja/docs/messaging-api/using-quick-reply/)

### ツール
- [Flex Message Builder](https://www.npmjs.com/package/line-messages-builder)
- [JSON to TypeScript](https://app.quicktype.io/)
- [ngrok](https://ngrok.com/)

---

## 📈 実装後の次ステップ

### Phase 3 の可能性
- LINE Pay 連携
- グループチャット対応
- LINEスター連携
- 音声メッセージ対応
- 画像共有機能

### 運用タスク
- メッセージテンプレートの継続的改善
- ユーザーエンゲージメント分析
- リマインダー成功率のモニタリング
- エラーログの監視

---

## 📝 実装ノート

### Tips

1. **Webhook開発のコツ**
   - ngrok を使ってローカルで テスト
   - LINE Studio でメッセージデバッグ
   - ローカルログを詳細に記録

2. **型安全性**
   - `@line/bot-sdk` の型を活用
   - TypeScript `strict` モードを維持
   - インターフェース定義を明確に

3. **エラーハンドリング**
   - Webhook は常に 200 を返す
   - エラーはサーバーログに記録
   - クライアント向けエラーメッセージを隠す

---

## 👥 チーム情報

- **Owner**: @hiiragi17
- **Status**: 実装準備完了
- **Created**: 2025-11-17
- **Updated**: 2025-11-17

---

## ✅ 完了確認

実装完了時のチェックリスト:

```
[ ] すべてのタスク完了
[ ] ユニットテスト合格（カバレッジ > 80%）
[ ] 統合テスト合格
[ ] E2Eテスト合格
[ ] セキュリティレビュー合格
[ ] パフォーマンステスト合格（Webhook < 500ms）
[ ] ドキュメント更新完了
[ ] デプロイメント完了
[ ] 本番環境で動作確認
[ ] 監視・ログ設定完了
```

---

**このドキュメントは設計段階での最終版です。実装中に追加の情報や変更が必要な場合は更新してください。**

---

Generated: 2025-11-17
Version: 1.0
Status: ✅ Ready for Implementation
