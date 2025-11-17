# Task 4.1: LINE Developers環境構築

**Type**: Task
**Priority**: Highest
**Phase**: Phase 2 - Day 8
**Estimated**: 2 hours
**Status**: Not Started

## 📌 概要

LINE DevelopersアカウントとLINEプロバイダーを作成し、Messaging APIおよびLINE Loginチャネルを立ち上げる。

## 🎯 詳細タスク

### 4.1.1 LINE Developersアカウント準備（30分）

#### Step 1: アカウント作成・確認（15分）
```
[ ] https://developers.line.biz/ にアクセス
[ ] LINEアカウントでログイン（未登録なら登録）
[ ] 開発者登録完了（電話番号認証含む）
[ ] 利用規約への同意
```

**アウトプット**: LINE Developersコンソール アクセス確認

#### Step 2: プロバイダー作成（15分）
```
[ ] 「新規プロバイダー作成」をクリック
[ ] プロバイダー名: ReflectHub
[ ] 会社・組織名: 個人の場合は個人名
[ ] プロバイダー作成完了確認
```

**アウトプット**: プロバイダーID: `ReflectHub`

---

### 4.1.2 Messaging API Channelセットアップ（45分）

#### Step 1: チャネル基本設定（15分）
```
プロバイダー: ReflectHub
チャネルの種類: Messaging API
地域: 日本
チャネル名: ReflectHub Bot
チャネル説明: 振り返り習慣化を支援するリマインダーボット
大業種: IT・インターネット・ゲーム
小業種: インターネットサービス
```

**チェックリスト**:
```
[ ] プロバイダー選択: ReflectHub
[ ] チャネル種類を「Messaging API」を選択
[ ] 各項目を入力
[ ] 利用規約に同意
```

**アウトプット**: Messaging APIチャネル作成完了

#### Step 2: チャネル詳細設定（20分）
```
[ ] チャネルアイコン画像アップロード（512x512px推奨）
[ ] プライバシーポリシーURL設定（後で更新可能）
    参考: https://example.com/privacy
[ ] 利用規約URL設定（後で更新可能）
    参考: https://example.com/terms
```

#### Step 3: 認証情報取得（10分）

**Channel Access Token（長期）生成**:
```
[ ] 「チャネル設定」→「Messaging API設定」
[ ] 「チャネルアクセストークン（長期）」を発行
[ ] トークンをメモ: Ynxxxxxxxxxxxxxxxxxxxxxxxx
```

**Channel Secret確認**:
```
[ ] 「チャネル基本設定」→「チャネルシークレット」
[ ] シークレットをメモ: xxxxxxxxxxxxxxxxxxxxxxxx
```

**アウトプット**: 認証情報を `.env.local` に追加
```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=Ynxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 4.1.3 LINE Login Channelセットアップ（30分）

#### Step 1: ログインチャネル作成（15分）
```
プロバイダー: ReflectHub（既存）
チャネルの種類: LINE Login
地域: 日本
チャネル名: ReflectHub Login
チャネル説明: ReflectHub ログイン機能
アプリタイプ: ウェブアプリ
```

**チェックリスト**:
```
[ ] 「新規チャネル作成」をクリック
[ ] チャネル種類を「LINE Login」を選択
[ ] 各項目を入力
[ ] チャネル作成実行
```

**アウトプット**: LINE Loginチャネル作成完了

#### Step 2: コールバックURL設定（15分）

**LINE Login設定を開く**:
```
[ ] 「チャネル設定」→「LINE Login設定」
```

**コールバックURLを追加**:
```
[ ] URL 1: http://localhost:3000/auth/line/callback
[ ] URL 2: https://your-domain.vercel.app/auth/line/callback
      （本番環境 - 後で更新可能）
```

**スコープ設定確認**:
```
[ ] profile: ✓ チェック
[ ] openid: ✓ チェック
[ ] email: □ チェック外し（オプション）
```

**認証情報取得**:
```
[ ] Channel ID: 1234567890
[ ] Channel Secret: xxxxxxxxxxxxxxxxxxxxxxxx
```

**アウトプット**: 認証情報を `.env.local` に追加
```env
# LINE Login (OAuth2)
NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 4.1.4 環境変数ファイル整備（15分）

**ファイル**: `.env.local`

```env
# 既存の設定（変更なし）
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=Ynxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# LINE Login (OAuth2)
NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

**確認**:
```
[ ] ファイル保存確認
[ ] `.env.local` が `.gitignore` に含まれているか確認
[ ] 各トークン・シークレットが正確にコピーされているか確認
```

---

## 📋 チェックリスト

### 準備フェーズ
- [ ] LINE Developersアカウント作成
- [ ] 電話番号認証完了

### Messaging API設定
- [ ] プロバイダー「ReflectHub」作成
- [ ] チャネル「ReflectHub Bot」作成
- [ ] チャネルアイコン画像アップロード
- [ ] Channel Access Token 生成・保存
- [ ] Channel Secret 確認・保存

### LINE Login設定
- [ ] チャネル「ReflectHub Login」作成
- [ ] コールバックURL設定
- [ ] スコープ設定確認
- [ ] Channel ID 取得・保存
- [ ] Channel Secret 取得・保存

### 環境変数設定
- [ ] `.env.local` ファイル作成/更新
- [ ] 全トークン・シークレット正確に入力
- [ ] ファイル保存確認

---

## ✅ 完了条件

```
[ ] LINE Developersコンソールにアクセス可能
[ ] Messaging APIチャネル作成完了
[ ] LINE Loginチャネル作成完了
[ ] 認証情報（合計4つ）取得完了
[ ] .env.local ファイル設定完了
[ ] ローカル環境で環境変数読み込み確認
```

---

## 📸 スクリーンショット例

**確認画面**:
1. LINE Developers コンソール（プロバイダー一覧）
2. Messaging APIチャネル基本設定ページ
3. チャネルアクセストークン発行画面
4. LINE Login チャネル設定ページ

**メモ**: スクリーンショットは機密情報を含むため、トークン・シークレットはマスキングしてから投稿してください。

---

## 🔗 参考リソース

- [LINE Developers コンソール](https://developers.line.biz/)
- [Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/getting-started/)
- [LINE Login ドキュメント](https://developers.line.biz/ja/docs/line-login/)

---

## 📝 実装ノート

### よくあるエラー

**エラー**: 「Email is required」
```
→ LINE アカウント登録時にメールアドレスを設定してください
```

**エラー**: 「Phone number verification failed」
```
→ 電話番号は国番号なし（例: 09012345678）で入力してください
```

**エラー**: チャネルアイコン画像が受け入れられない
```
→ 画像は 512×512px 以上の正方形JPG/PNGである必要があります
```

---

**Labels**: `line-integration`, `setup`, `day-8`
**Assignee**: @hiiragi17
**Epic**: [EPIC] LINE連携実装 フェーズ2
**Milestone**: Phase 2 - LINE Integration
