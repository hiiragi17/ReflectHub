# Task 4.2: 開発環境セットアップ

**Type**: Task
**Priority**: Highest
**Phase**: Phase 2 - Day 8
**Estimated**: 2 hours
**Depends On**: Task 4.1 (LINE Developers環境構築)
**Status**: Not Started

## 📌 概要

プロジェクトに必要なLINE関連パッケージをインストールし、ディレクトリ構造を準備し、LINE SDK クライアントを初期化する。

## 🎯 詳細タスク

### 4.2.1 パッケージインストール（20分）

#### 確認済みパッケージ
以下のパッケージは既にインストール済みです：
```json
{
  "@line/bot-sdk": "^10.2.0",
  "date-fns": "^4.1.0"
}
```

**コマンド**: 確認用
```bash
npm list @line/bot-sdk date-fns
```

#### 追加パッケージインストール
```bash
# バリデーション・クリプト関連
npm install joi --save

# 環境変数管理（次フェーズ）
npm install dotenv --save

# 型定義関連
npm install -D @types/node --save-dev
```

#### Webhook開発用ツール（オプション・選択肢）

**方法 1: ngrok グローバル版（推奨）**
```bash
# macOS
brew install ngrok

# Linux
curl https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o ngrok.zip
unzip ngrok.zip
sudo mv ngrok /usr/local/bin
```

**方法 2: npm版**
```bash
npm install -D @ngrok/ngrok
```

**確認コマンド**:
```bash
npx ngrok --version
```

---

### 4.2.2 ディレクトリ構造準備（30分）

#### 既存確認
プロジェクト構造を確認：
```bash
ls -la src/lib/
ls -la src/app/api/
```

#### 新規ディレクトリ作成
```bash
# LINE統合関連
mkdir -p src/lib/line
mkdir -p src/app/api/line/webhook
mkdir -p src/app/api/auth/line/callback
mkdir -p src/app/api/settings/reminder
mkdir -p src/app/api/cron

# コンポーネント・テンプレート
mkdir -p src/components/auth
mkdir -p src/components/settings
mkdir -p src/templates
mkdir -p src/services/line
```

#### ファイルスケルトン作成
以下のファイルを空で作成（内容は次ステップで実装）：

```bash
# LINE ライブラリ
touch src/lib/line/client.ts
touch src/lib/line/webhook.ts
touch src/lib/line/messaging.ts
touch src/lib/line/auth.ts
touch src/lib/line/types.ts
touch src/lib/line/validator.ts
touch src/lib/line/richMenu.ts

# API ルート
touch src/app/api/line/webhook/route.ts
touch src/app/api/auth/line/callback/route.ts
touch src/app/api/settings/reminder/route.ts
touch src/app/api/cron/reminders/route.ts

# コンポーネント
touch src/components/auth/LineLoginButton.tsx
touch src/components/settings/ReminderSettings.tsx

# テンプレート・サービス
touch src/templates/lineMessages.ts
touch src/services/line/reminderService.ts
touch src/services/line/messageService.ts

# 型定義
touch src/types/line.ts
```

**確認コマンド**:
```bash
find src/lib/line src/app/api/line src/app/api/auth/line -type f -name "*.ts" -o -name "*.tsx"
```

---

### 4.2.3 LINE SDK基本設定（30分）

#### ファイル: `src/lib/line/client.ts`

```typescript
import { Client } from '@line/bot-sdk';

export interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
}

const config: LineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// バリデーション（開発環境では警告のみ）
if (!config.channelAccessToken || !config.channelSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('LINE credentials are not set');
  } else {
    console.warn(
      '⚠️  LINE credentials are not fully configured. ' +
      'Some features may not work in this environment.'
    );
  }
}

export const lineClient = new Client(config);

export const getLineConfig = (): LineConfig => config;
```

**実装チェック**:
```typescript
// src/lib/line/client.ts が以下の条件を満たしているか確認
[ ] Client が正しくインスタンス化されている
[ ] 環境変数チェックが実装されている
[ ] エラーハンドリングが適切である
[ ] TypeScript型が正確である
```

---

#### ファイル: `src/lib/line/validator.ts`

```typescript
import crypto from 'crypto';

/**
 * LINE Webhook署名の検証
 *
 * LINE Platform からの署名付きリクエストが本物であることを確認します
 * https://developers.line.biz/ja/docs/messaging-api/receiving-messages/#webhook-event
 *
 * @param body - リクエストボディの文字列
 * @param signature - X-Line-Signature ヘッダー値
 * @param channelSecret - LINE チャネルシークレット
 * @returns 署名が有効な場合 true
 */
export function validateLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');

  return hash === signature;
}

/**
 * Webhookリクエストボディの基本検証
 */
export function validateWebhookBody(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const data = body as Record<string, unknown>;

  return (
    'events' in data &&
    Array.isArray(data.events) &&
    data.events.length > 0
  );
}
```

**実装チェック**:
```typescript
[ ] crypto モジュールが正しくインポートされている
[ ] HMAC-SHA256 検証が正しく実装されている
[ ] Base64エンコーディングが正確である
[ ] バリデーション関数が完全である
```

---

### 4.2.4 Webhook基盤実装（40分）

#### ファイル: `src/app/api/line/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@line/bot-sdk';
import { validateLineSignature, validateWebhookBody } from '@/lib/line/validator';

/**
 * Webhook 署名検証関数
 * 環境変数から channelSecret を取得
 */
function getChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    throw new Error('LINE_CHANNEL_SECRET is not set');
  }
  return secret;
}

/**
 * LINE Webhook エンドポイント
 *
 * POST /api/line/webhook
 *
 * LINE Platform からのイベントを受け取ります
 * https://developers.line.biz/ja/docs/messaging-api/receiving-messages/
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. リクエストボディ取得
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') ?? '';

    // 2. 署名検証
    const channelSecret = getChannelSecret();

    if (!validateLineSignature(body, signature, channelSecret)) {
      console.warn('⚠️  Invalid LINE signature received');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. ボディ検証とパース
    let events: WebhookEvent[];
    try {
      const data = JSON.parse(body);

      if (!validateWebhookBody(data)) {
        return NextResponse.json(
          { error: 'Invalid webhook body' },
          { status: 400 }
        );
      }

      events = data.events as WebhookEvent[];
    } catch (error) {
      console.error('Failed to parse webhook body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // 4. イベント処理（非同期、エラー時は続行）
    for (const event of events) {
      try {
        // TODO: handleLineEvent(event) を実装
        console.log(`Event received: ${event.type}`);
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error);
        // LINE に成功を返すため、ここでは例外を投げない
      }
    }

    // 5. LINE Platform に 200 OK を返す（必須）
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in webhook:', error);
    // LINE へは 200 を返してリトライ無限ループを防ぐ
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}
```

**実装チェック**:
```typescript
[ ] リクエストボディの読み込みが正確である
[ ] X-Line-Signature ヘッダーを正しく取得している
[ ] 署名検証が実装されている
[ ] エラーハンドリングが完全である
[ ] すべてのケースで適切なHTTPステータスコードを返している
[ ] LINE へは常に 200 OK を返している
```

---

## 📋 チェックリスト

### パッケージ確認・インストール
- [ ] @line/bot-sdk 既存確認
- [ ] date-fns 既存確認
- [ ] joi インストール
- [ ] dotenv インストール
- [ ] @types/node インストール
- [ ] ngrok インストール（選択）

### ディレクトリ構造
- [ ] src/lib/line/ ディレクトリ作成
- [ ] src/app/api/line/ ディレクトリ作成
- [ ] src/app/api/auth/line/ ディレクトリ作成
- [ ] src/components/auth/ 確認
- [ ] src/templates/ ディレクトリ作成
- [ ] src/services/line/ ディレクトリ作成

### ファイル実装
- [ ] src/lib/line/client.ts 実装完了
- [ ] src/lib/line/validator.ts 実装完了
- [ ] src/app/api/line/webhook/route.ts 実装完了
- [ ] その他のスケルトンファイル作成

### ビルド・テスト
- [ ] TypeScript エラー無し: `npm run lint`
- [ ] ビルド成功: `npm run build`
- [ ] ローカル起動成功: `npm run dev`
- [ ] 環境変数読み込み確認

---

## ✅ 完了条件

```
[ ] すべてのパッケージが正常にインストールされている
[ ] ディレクトリ構造が完成している
[ ] LINE SDK クライアントが初期化されている
[ ] Webhook エンドポイント実装完了
[ ] TypeScript エラーが無い
[ ] npm run build が成功する
[ ] npm run dev でローカル起動が成功する
```

---

## 🔗 参考リソース

- [@line/bot-sdk NPM](https://www.npmjs.com/package/@line/bot-sdk)
- [LINE Bot SDK (Node.js)](https://github.com/line/line-bot-sdk-nodejs)
- [Webhook イベント仕様](https://developers.line.biz/ja/docs/messaging-api/receiving-messages/)

---

## 📝 実装ノート

### TypeScript 厳格モード

このプロジェクトは `strict: true` で設定されているため、以下に注意：

```typescript
// ❌ NG - 型が undefined の可能性
const secret = process.env.LINE_CHANNEL_SECRET;
lineClient.pushMessage(userId, message); // userId が undefined かもしれない

// ✅ OK - 型安全
const secret = process.env.LINE_CHANNEL_SECRET ?? '';
if (!secret) throw new Error('...');
```

### 環境変数の読み込み

```typescript
// Next.js では .env.local が自動的に読み込まれます
// ただし NEXT_PUBLIC_ プレフィックスなしは、サーバーサイドのみで利用可能
process.env.LINE_CHANNEL_SECRET // サーバーサイド ✓
process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID // クライアント + サーバー ✓
```

---

**Labels**: `line-integration`, `setup`, `backend`, `day-8`
**Assignee**: @hiiragi17
**Epic**: [EPIC] LINE連携実装 フェーズ2
**Milestone**: Phase 2 - LINE Integration
