# LINE連携実装 詳細設計書

**ドキュメント作成日**: 2025-11-17
**Phase**: Phase 2 - LINE連携実装
**版**: v1.0

---

## 📋 目次

1. [概要](#概要)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [実装フェーズ](#実装フェーズ)
4. [データベース設計](#データベース設計)
5. [API仕様](#api仕様)
6. [セキュリティ考慮](#セキュリティ考慮)
7. [テスト計画](#テスト計画)
8. [デプロイメント計画](#デプロイメント計画)

---

## 概要

### 目的
ReflectHubにLINE連携機能を実装し、ユーザーがLINE経由で振り返りリマインダーを受け取り、手軽に振り返りを実行できるようにする。

### スコープ
- ✅ LINE Messaging API統合（Webhook処理）
- ✅ LINE Login認証フロー
- ✅ リッチメニュー実装
- ✅ リマインダー機能（Push Message）
- ✅ メッセージテンプレート管理
- ✅ ユーザー設定管理

### 非スコープ
- LINE Pay連携
- グループチャット対応
- LINEスター連携

---

## アーキテクチャ設計

### 全体構成図

```
┌─────────────────────────────────────────────────────────┐
│                    LINE Platform                         │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │ Messaging   │  │ Login      │  │ Rich Menu       │  │
│  │ API         │  │ Channel    │  │ (Optional)      │  │
│  └──────┬──────┘  └──────┬─────┘  └─────────────────┘  │
└─────────┼──────────────────┼────────────────────────────┘
          │                  │
    Webhook/Push         OAuth2.1
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              ReflectHub Backend (Next.js)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Routes                                         │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │ POST /api/line/webhook          (Webhook)   │  │ │
│  │  │ GET  /api/auth/line/callback    (OAuth2)    │  │ │
│  │  │ POST /api/settings/reminder     (Settings)  │  │ │
│  │  │ GET  /api/cron/reminders        (Scheduled) │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Line Integration Layer                             │ │
│  │  ├── lib/line/client.ts       (SDK初期化)         │ │
│  │  ├── lib/line/webhook.ts      (Webhook処理)       │ │
│  │  ├── lib/line/messaging.ts    (メッセージ送信)   │ │
│  │  ├── lib/line/auth.ts         (OAuth処理)        │ │
│  │  └── lib/line/types.ts        (型定義)           │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┬┘
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │    Supabase      │
                                                  │  ┌────────────┐  │
                                                  │  │ profiles   │  │
                                                  │  │ (LINE用)   │  │
                                                  │  ├────────────┤  │
                                                  │  │user_settings│ │
                                                  │  │(リマインダー│  │
                                                  │  └────────────┘  │
                                                  └──────────────────┘
```

### ディレクトリ構造

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── line/
│   │   │       └── callback/
│   │   │           └── route.ts           # OAuth2 Callback
│   │   ├── line/
│   │   │   └── webhook/
│   │   │       └── route.ts              # Webhook Receiver
│   │   ├── settings/
│   │   │   └── reminder/
│   │   │       └── route.ts              # Reminder Settings API
│   │   └── cron/
│   │       └── reminders/
│   │           └── route.ts              # Scheduled Reminders (Vercel Cron)
│   └── auth/
│       └── line/
│           └── page.tsx                  # LINE Login Button Page
│
├── lib/
│   └── line/
│       ├── client.ts                     # LINE Bot SDK Instance
│       ├── webhook.ts                    # Webhook Event Handler
│       ├── messaging.ts                  # Message Sending Service
│       ├── auth.ts                       # OAuth2 & User Management
│       ├── richMenu.ts                   # Rich Menu Management
│       ├── types.ts                      # TypeScript Interfaces
│       └── validator.ts                  # Request Validator
│
├── components/
│   ├── auth/
│   │   └── LineLoginButton.tsx           # LINE Login Button Component
│   └── settings/
│       └── ReminderSettings.tsx           # Reminder Settings UI
│
├── services/
│   └── line/
│       ├── reminderService.ts            # Business Logic
│       └── messageService.ts             # Message Management
│
├── types/
│   └── line.ts                           # Shared Type Definitions
│
└── templates/
    └── lineMessages.ts                   # Message Templates
```

---

## 実装フェーズ

### Phase 1: LINE環境構築 (Day 8: 2時間)

#### 1.1 LINE Developersアカウント・プロバイダー準備 (30分)

**目標**: LINE DevelopersアカウントとプロバイダーReflectHubを作成

**チェックリスト**:
- [ ] https://developers.line.biz/ にアクセス
- [ ] LINEアカウントで登録・ログイン（既存アカウント使用可）
- [ ] 電話番号認証を完了
- [ ] 新規プロバイダー「ReflectHub」を作成

**アウトプット**:
- LINE Developersコンソールアクセス確認
- プロバイダーID: `ReflectHub`

---

#### 1.2 Messaging API Channelセットアップ (45分)

**目標**: LINE Messaging APIチャネルの作成と認証情報の取得

**Step 1: チャネル基本設定**
```
プロバイダー: ReflectHub
チャネルタイプ: Messaging API
チャネル名: ReflectHub Bot
チャネル説明: 振り返り習慣化を支援するリマインダーボット
大業種: IT・インターネット・ゲーム
小業種: インターネットサービス
```

**Step 2: チャネル詳細設定**
- [ ] チャネルアイコン画像アップロード（512x512px）
- [ ] プライバシーポリシーURL設定（後で更新可能）
- [ ] 利用規約URL設定（後で更新可能）

**Step 3: 認証情報取得**
- [ ] Channel Access Token（長期）生成
- [ ] Channel Secret確認

**アウトプット**: `.env.local` に下記を追加
```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=Ynxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

#### 1.3 LINE Login Channelセットアップ (30分)

**目標**: LINE Loginチャネルの作成とOAuth2設定

**Step 1: チャネル作成**
```
プロバイダー: ReflectHub
チャネルタイプ: LINE Login
チャネル名: ReflectHub Login
アプリタイプ: ウェブアプリ
```

**Step 2: コールバックURL設定**
- [ ] `http://localhost:3000/auth/line/callback` （開発環境）
- [ ] `https://your-domain.com/auth/line/callback` （本番環境）

**Step 3: スコープ設定**
- [x] profile
- [x] openid
- [ ] email（オプション）

**Step 4: 認証情報取得**
- [ ] Channel ID（LINE Login）
- [ ] Channel Secret（LINE Login）

**アウトプット**: `.env.local` に追加
```env
# LINE Login (OAuth2)
NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**環境変数ファイル確認**:
```bash
# .env.local の完全形
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=Ynxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# LINE Login (OAuth2)
NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Phase 2: 開発環境セットアップ (Day 8: 2時間)

#### 2.1 パッケージ確認・追加 (20分)

**既にインストール済み**:
```json
{
  "@line/bot-sdk": "^10.2.0",
  "date-fns": "^4.1.0"
}
```

**追加インストール**:
```bash
npm install crypto joi --save
npm install -D ts-node types-node
```

**Webhook開発用ツール** (オプション):
```bash
npm install -g ngrok
# または
npm install -D @ngrok/ngrok
```

---

#### 2.2 LINE SDKクライアント初期化 (30分)

**ファイル**: `src/lib/line/client.ts`

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

// バリデーション
if (!config.channelAccessToken || !config.channelSecret) {
  console.warn(
    '⚠️  LINE credentials are not fully configured. ' +
    'Some features may not work in this environment.'
  );
}

export const lineClient = new Client(config);

export const getLineConfig = (): LineConfig => config;
```

---

#### 2.3 署名検証実装 (30分)

**ファイル**: `src/lib/line/validator.ts`

```typescript
import crypto from 'crypto';

/**
 * LINE Webhook署名の検証
 *
 * LINE Platform からの署名付きリクエストが本物であることを確認します
 * https://developers.line.biz/ja/docs/messaging-api/receiving-messages/#webhook-event
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
 * Webhookリクエストボディの検証
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

---

#### 2.4 Webhook基盤実装 (40分)

**ファイル**: `src/app/api/line/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@line/bot-sdk';
import { validateLineSignature, validateWebhookBody } from '@/lib/line/validator';
import { handleLineEvent } from '@/lib/line/webhook';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. リクエストボディ取得
  const body = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';

  // 2. 署名検証
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error('LINE_CHANNEL_SECRET is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (!validateLineSignature(body, signature, channelSecret)) {
    console.warn('Invalid LINE signature received');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // 3. ボディ検証
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

  // 4. イベント処理（非同期、失敗しても200を返す）
  try {
    await Promise.all(
      events.map((event) =>
        handleLineEvent(event).catch((error) => {
          console.error(`Error handling event ${event.type}:`, error);
        })
      )
    );
  } catch (error) {
    console.error('Unexpected error in webhook processing:', error);
    // LINEに成功を返す（デッドロック防止）
  }

  // 5. LINE Platform に200 OK を返す（必須）
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
```

---

### Phase 3: LINE Login認証フロー (Day 9: 3時間)

#### 3.1 ログインボタンコンポーネント (45分)

**ファイル**: `src/components/auth/LineLoginButton.tsx`

```typescript
'use client';

import { useState } from 'react';

/**
 * LINE Login ボタンコンポーネント
 *
 * LINE OAuth2.1 フローを開始します
 * https://developers.line.biz/ja/docs/line-login/web/integrate-line-login/
 */
export function LineLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLineLogin = () => {
    setIsLoading(true);

    try {
      // 1. 必要なパラメータ取得
      const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
      const redirectUri = `${window.location.origin}/auth/line/callback`;

      if (!channelId) {
        throw new Error('LINE_LOGIN_CHANNEL_ID is not configured');
      }

      // 2. CSRF対策: State生成
      const state = generateRandomString(32);
      sessionStorage.setItem('line_auth_state', state);

      // 3. PKCE対策: Code Verifier生成（オプション）
      const codeVerifier = generateRandomString(43);
      sessionStorage.setItem('line_code_verifier', codeVerifier);

      // 4. Authorization URL構築
      const authUrl = new URL(
        'https://access.line.me/oauth2/v2.1/authorize'
      );
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', channelId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', 'profile openid');

      // 5. リダイレクト
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('LINE login failed:', error);
      setIsLoading(false);
      // TODO: エラーハンドリング
    }
  };

  return (
    <button
      onClick={handleLineLogin}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2
        px-6 py-3 rounded-lg font-semibold
        bg-[#00B900] hover:bg-[#009900] text-white
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
      `}
    >
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        {/* LINE Logo SVG */}
      </svg>
      {isLoading ? 'ログイン中...' : 'LINEでログイン'}
    </button>
  );
}

/**
 * クリプトセキュアなランダム文字列生成
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}
```

---

#### 3.2 OAuth2 Callback処理 (90分)

**ファイル**: `src/app/auth/line/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncLineUserProfile } from '@/lib/line/auth';

/**
 * LINE OAuth2.1 Callback Handler
 *
 * ユーザーがLINEログインを承認した後、
 * LINEから Authorizationコードを受け取りこのエンドポイントにリダイレクトされます
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // 1. エラーチェック
  if (error) {
    console.error('LINE OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/error?error=${error}`, request.url)
    );
  }

  if (!code || !state) {
    console.error('Missing required parameters:', { code, state });
    return NextResponse.redirect(
      new URL('/auth/error?error=missing_parameters', request.url)
    );
  }

  // 2. CSRF検証
  const storedState = request.cookies.get('line_auth_state')?.value;
  if (state !== storedState) {
    console.error('State mismatch - possible CSRF attack');
    return NextResponse.redirect(
      new URL('/auth/error?error=state_mismatch', request.url)
    );
  }

  try {
    // 3. LINE からのアクセストークン取得
    const tokenResponse = await fetch(
      'https://api.line.me/oauth2/v2.1/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/line/callback`,
          client_id: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID!,
          client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
        }).toString(),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenData.error_description}`);
    }

    // 4. LINEからユーザープロフィール取得
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch LINE profile');
    }

    const lineProfile = await profileResponse.json();

    // 5. ユーザーを Supabase に作成/更新
    const supabase = await createClient();
    const { data: session } = await syncLineUserProfile(
      supabase,
      lineProfile,
      tokenData
    );

    if (!session) {
      throw new Error('Failed to create session');
    }

    // 6. ダッシュボードへリダイレクト
    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    );

    return response;
  } catch (error) {
    console.error('LINE login callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=auth_failed', request.url)
    );
  }
}
```

---

#### 3.3 ユーザー同期処理 (45分)

**ファイル**: `src/lib/line/auth.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * LINEユーザープロフィールを Supabase に同期
 */
export async function syncLineUserProfile(
  supabase: SupabaseClient,
  lineProfile: LineProfile,
  tokenData: LineTokenData
) {
  // 1. 既存ユーザーチェック
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('line_user_id', lineProfile.userId)
    .single();

  if (existingUser) {
    // 2a. 既存ユーザー更新
    const { error } = await supabase
      .from('profiles')
      .update({
        name: lineProfile.displayName,
        avatar_url: lineProfile.pictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', lineProfile.userId);

    if (error) throw error;

    // セッション情報を返す
    const { data: session } = await supabase.auth.getSession();
    return { data: session };
  } else {
    // 2b. 新規ユーザー作成
    // LINE IDのみを使用した仮のメールアドレスを生成
    const tempEmail = `line_${lineProfile.userId}@line.local`;

    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email: tempEmail,
      password: generateRandomPassword(16),
      options: {
        data: {
          name: lineProfile.displayName,
          avatar_url: lineProfile.pictureUrl,
          line_user_id: lineProfile.userId,
          provider: 'line',
        },
      },
    });

    if (signUpError) throw signUpError;

    if (user?.user) {
      // プロフィール テーブルにも記録
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.user.id,
          line_user_id: lineProfile.userId,
          name: lineProfile.displayName,
          avatar_url: lineProfile.pictureUrl,
          provider: 'line',
        });

      if (profileError) throw profileError;

      return { data: user.session };
    }
  }

  throw new Error('Failed to sync user profile');
}

/**
 * セキュアなランダムパスワード生成
 */
function generateRandomPassword(length: number): string {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';

  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}
```

---

### Phase 4: Webhook処理拡張 (Day 9-10: 2時間)

#### 4.1 Webhook イベント処理

**ファイル**: `src/lib/line/webhook.ts`

```typescript
import {
  WebhookEvent,
  MessageEvent,
  FollowEvent,
  PostbackEvent,
  BeaconEvent,
} from '@line/bot-sdk';
import { lineClient } from './client';
import { createClient } from '@/lib/supabase/server';

/**
 * LINE Webhook イベント処理メインハンドラ
 */
export async function handleLineEvent(event: WebhookEvent): Promise<void> {
  console.log(`Processing event: ${event.type}`, event);

  switch (event.type) {
    case 'message':
      await handleMessage(event as MessageEvent);
      break;

    case 'follow':
      await handleFollow(event as FollowEvent);
      break;

    case 'unfollow':
      await handleUnfollow(event as FollowEvent);
      break;

    case 'postback':
      await handlePostback(event as PostbackEvent);
      break;

    case 'beacon':
      await handleBeacon(event as BeaconEvent);
      break;

    case 'account_link':
    case 'things':
      // 将来の拡張用
      break;

    default:
      console.log('Unhandled event type:', event.type);
  }
}

/**
 * メッセージイベント処理
 */
async function handleMessage(event: MessageEvent): Promise<void> {
  const { replyToken, source, message } = event;

  if (message.type !== 'text') {
    return;
  }

  const text = message.text.toLowerCase().trim();
  const userId = source.userId!;

  // キーワード判定
  if (
    text.includes('振り返り') ||
    text.includes('ふりかえり') ||
    text.includes('reflection')
  ) {
    await handleReflectionKeyword(replyToken);
  } else if (
    text.includes('help') ||
    text.includes('ヘルプ') ||
    text.includes('サポート')
  ) {
    await handleHelpKeyword(replyToken);
  } else if (text === 'test' && process.env.NODE_ENV === 'development') {
    // 開発時テスト用
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: 'テストメッセージを受け取りました ✅',
    });
  } else {
    // デフォルト応答
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: 'ReflectHubへようこそ！\n\n「振り返り」と入力するか、\nメニューから機能を選択してください。',
    });
  }
}

/**
 * Follow イベント処理（ユーザーがボットをフォロー）
 */
async function handleFollow(event: FollowEvent): Promise<void> {
  const userId = event.source.userId!;

  try {
    // ウェルカムメッセージ送信
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: 'ReflectHubへようこそ！🎉\n\n毎週の振り返り習慣で、継続的な成長をサポートします。\n\nまずは下のボタンから振り返りを始めてみませんか？',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'uri',
              label: '初回振り返り',
              uri: `${process.env.NEXT_PUBLIC_APP_URL}/reflection?first=true`,
            },
          },
        ],
      },
    });

    // Supabase にフォロー情報を記録
    const supabase = await createClient();
    await supabase
      .from('profiles')
      .update({
        line_follow_status: 'followed',
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', userId);
  } catch (error) {
    console.error('Error handling follow event:', error);
  }
}

/**
 * Unfollow イベント処理（ユーザーがボットをブロック）
 */
async function handleUnfollow(event: FollowEvent): Promise<void> {
  const userId = event.source.userId!;

  try {
    const supabase = await createClient();
    await supabase
      .from('profiles')
      .update({
        line_follow_status: 'unfollowed',
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', userId);
  } catch (error) {
    console.error('Error handling unfollow event:', error);
  }
}

/**
 * Postback イベント処理（リッチメニューボタンなど）
 */
async function handlePostback(event: PostbackEvent): Promise<void> {
  const { replyToken, source, postback } = event;
  const data = postback.data;

  if (data === 'snooze_1hour') {
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '了解しました！1時間後にリマインドします。\n🔔 次の通知をお待ちください。',
    });
  }
}

/**
 * Beacon イベント処理（iBeacon）
 */
async function handleBeacon(event: BeaconEvent): Promise<void> {
  const { replyToken } = event;
  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: 'ビーコン検知しました',
  });
}

/**
 * 振り返りキーワード処理
 */
async function handleReflectionKeyword(replyToken: string): Promise<void> {
  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: '振り返りページを開きますね！\n📝 下のボタンからアクセスしてください',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '振り返りを始める',
            uri: `${process.env.NEXT_PUBLIC_APP_URL}/reflection`,
          },
        },
      ],
    },
  });
}

/**
 * ヘルプキーワード処理
 */
async function handleHelpKeyword(replyToken: string): Promise<void> {
  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: `🤖 ReflectHub ヘルプ

📝 振り返りの作成
📊 履歴の確認
⚙️ 設定の変更

各機能はメニューからアクセスできます！`,
  });
}
```

---

### Phase 5: メッセージ送信機能 (Day 10: 4時間)

#### 5.1 メッセージング管理サービス

**ファイル**: `src/lib/line/messaging.ts`

```typescript
import { lineClient } from './client';
import { createClient } from '@/lib/supabase/server';

export type MessageType = 'push' | 'reply' | 'multicast';

interface MessageLog {
  user_id: string;
  message_type: MessageType;
  status: 'sent' | 'failed';
  error_message?: string;
  sent_at: string;
}

/**
 * LINE メッセージング管理サービス
 */
export class LineMessagingService {
  /**
   * Push Message を単一ユーザーに送信
   */
  static async sendPushMessage(
    userId: string,
    message: any,
    shouldLog: boolean = true
  ): Promise<void> {
    try {
      await lineClient.pushMessage(userId, message);

      if (shouldLog) {
        await this.logMessage({
          user_id: userId,
          message_type: 'push',
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Failed to send push message to ${userId}:`, error);

      if (shouldLog) {
        await this.logMessage({
          user_id: userId,
          message_type: 'push',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: new Date().toISOString(),
        });
      }

      throw error;
    }
  }

  /**
   * Reply Message を送信
   */
  static async sendReplyMessage(replyToken: string, message: any): Promise<void> {
    try {
      await lineClient.replyMessage(replyToken, message);
    } catch (error) {
      console.error('Failed to send reply message:', error);
      throw error;
    }
  }

  /**
   * Multicast Message を複数ユーザーに送信
   */
  static async sendMulticastMessage(
    userIds: string[],
    message: any
  ): Promise<void> {
    try {
      await lineClient.multicast(userIds, message);
    } catch (error) {
      console.error('Failed to send multicast message:', error);
      throw error;
    }
  }

  /**
   * メッセージログ記録
   */
  private static async logMessage(log: MessageLog): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('line_message_logs').insert(log);
    } catch (error) {
      console.error('Failed to log message:', error);
      // ログ失敗は通常エラーにしない
    }
  }

  /**
   * Broadcast Message を全ユーザーに送信（有料API）
   */
  static async sendBroadcastMessage(message: any): Promise<void> {
    try {
      await lineClient.broadcast(message);
    } catch (error) {
      console.error('Failed to send broadcast message:', error);
      throw error;
    }
  }
}
```

---

#### 5.2 リマインダーメッセージテンプレート

**ファイル**: `src/templates/lineMessages.ts`

```typescript
/**
 * LINE リマインダーメッセージテンプレート
 */

export const reminderMessages = {
  /**
   * 基本テキストリマインダー
   */
  basic: (userName: string) => ({
    type: 'text' as const,
    text: `${userName}さん、今週の振り返りをしませんか？\n\n📝 3分で今週を振り返り、来週をもっと良くしましょう！`,
    quickReply: {
      items: [
        {
          type: 'action' as const,
          action: {
            type: 'uri' as const,
            label: '今すぐ振り返る',
            uri: `${process.env.NEXT_PUBLIC_APP_URL}/reflection`,
          },
        },
        {
          type: 'action' as const,
          action: {
            type: 'postback' as const,
            label: '後で通知',
            data: 'snooze_1hour',
          },
        },
      ],
    },
  }),

  /**
   * Flexメッセージ版リマインダー
   */
  flexReminder: (userName: string) => ({
    type: 'flex' as const,
    altText: '振り返りのお時間です',
    contents: {
      type: 'bubble' as const,
      header: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: '📝 Reflect',
            weight: 'bold' as const,
            size: 'xl' as const,
            color: '#4CAF50',
          },
        ],
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: `${userName}さん、\n今週の振り返りをしませんか？`,
            size: 'md' as const,
            wrap: true,
          },
          {
            type: 'separator' as const,
            margin: 'md' as const,
          },
          {
            type: 'text' as const,
            text: '📊 YWTまたはKPTで振り返り\n⏰ 所要時間: 約3分',
            size: 'sm' as const,
            color: '#666666',
            margin: 'md' as const,
          },
        ],
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'button' as const,
            action: {
              type: 'uri' as const,
              label: '今すぐ振り返る',
              uri: `${process.env.NEXT_PUBLIC_APP_URL}/reflection`,
            },
            style: 'primary' as const,
            color: '#4CAF50',
          },
        ],
      },
    },
  }),

  /**
   * 振り返り完了通知
   */
  reflectionComplete: (userName: string) => ({
    type: 'text' as const,
    text: `${userName}さん、\n今週の振り返り、お疲れ様でした！\n\n🎯 来週も一緒に頑張りましょう！`,
  }),

  /**
   * ウェルカムメッセージ
   */
  welcome: (userName: string) => ({
    type: 'text' as const,
    text: `${userName}さん、ReflectHubへようこそ！🎉\n\n毎週の振り返り習慣で、継続的な成長をサポートします。`,
  }),
};

/**
 * メッセージテンプレート ID 定義
 */
export const messageTemplateIds = {
  WEEKLY_REMINDER: 'weekly_reminder',
  COMPLETION_NOTICE: 'completion_notice',
  WELCOME: 'welcome',
  STREAK_MILESTONE: 'streak_milestone',
} as const;
```

---

## データベース設計

### テーブル拡張: profiles

```sql
ALTER TABLE profiles ADD COLUMN (
  line_user_id VARCHAR(255) UNIQUE,
  line_follow_status VARCHAR(50) DEFAULT 'unknown',
  line_display_name VARCHAR(255),
  line_picture_url TEXT,
  line_last_synced TIMESTAMPTZ,
  provider VARCHAR(50) DEFAULT 'email'
);

CREATE INDEX idx_profiles_line_user_id ON profiles(line_user_id);
```

### テーブル新規: user_settings

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- リマインダー設定
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '18:00:00',
  reminder_days INTEGER[] DEFAULT ARRAY[5], -- 0=Sun, 5=Fri
  reminder_timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
  reminder_framework VARCHAR(50) DEFAULT 'ywt', -- ywt, kpt

  -- LINE設定
  line_notifications_enabled BOOLEAN DEFAULT true,
  line_message_type VARCHAR(50) DEFAULT 'flex', -- flex, text

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

### テーブル新規: line_message_logs

```sql
CREATE TABLE line_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  message_type VARCHAR(50) NOT NULL, -- push, reply, multicast
  status VARCHAR(50) NOT NULL, -- sent, failed
  error_message TEXT,

  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_line_message_logs_user_id ON line_message_logs(user_id);
CREATE INDEX idx_line_message_logs_sent_at ON line_message_logs(sent_at);
```

### テーブル新規: line_rich_menu

```sql
CREATE TABLE line_rich_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rich_menu_id VARCHAR(255) UNIQUE NOT NULL,

  name VARCHAR(255),
  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API仕様

### 1. Webhook エンドポイント

**Endpoint**: `POST /api/line/webhook`

**Request Headers**:
```
X-Line-Signature: [署名]
Content-Type: application/json
```

**Request Body**:
```json
{
  "events": [
    {
      "type": "message|follow|unfollow|postback|beacon",
      "message": {
        "type": "text|image|audio|video|file|location|template|flex",
        "text": "..."
      },
      "replyToken": "...",
      "source": {
        "type": "user|group|room",
        "userId": "U..."
      },
      "timestamp": 1234567890000
    }
  ]
}
```

**Response**: `200 OK`
```json
{ "status": "ok" }
```

---

### 2. OAuth2 Callback エンドポイント

**Endpoint**: `GET /auth/line/callback`

**Query Parameters**:
```
code=<authorization_code>
state=<state>
error=<error_code> (if error)
error_description=<description> (if error)
```

**Redirect After Success**: `/dashboard`

**Redirect After Error**: `/auth/error?error=<error_code>`

---

### 3. リマインダー設定 API

**Endpoint**: `GET|POST /api/settings/reminder`

**Method: GET**
```json
{
  "enabled": true,
  "time": "18:00",
  "days": [5],
  "timezone": "Asia/Tokyo",
  "messageType": "flex"
}
```

**Method: POST**
```json
{
  "enabled": true,
  "time": "18:00",
  "days": [1, 2, 3, 4, 5, 6],
  "timezone": "Asia/Tokyo",
  "messageType": "flex"
}
```

**Response**: `200 OK`
```json
{ "success": true, "message": "設定を保存しました" }
```

---

### 4. 定期実行リマインダーエンドポイント

**Endpoint**: `GET /api/cron/reminders`

**説明**: Vercel Cron により毎時間実行
**認可**: `Authorization-Header` による検証

**Response**: `200 OK`
```json
{
  "success": true,
  "sent": 42,
  "failed": 2
}
```

---

## セキュリティ考慮

### 1. Webhook署名検証

✅ **必須実装**: すべてのWebhookリクエストで署名検証を実施

```typescript
// X-Line-Signature を使用した HMAC-SHA256 検証
validateLineSignature(body, signature, channelSecret)
```

### 2. OAuth2セキュリティ

✅ **State検証**: CSRF攻撃対策
```typescript
// Session/Cookie に state を保存
sessionStorage.setItem('line_auth_state', state)
```

✅ **HTTPS必須**: 本番環境でのコールバックURL

✅ **秘密情報の非公開化**:
- `LINE_CHANNEL_SECRET` - サーバーサイド環境変数
- `LINE_LOGIN_CHANNEL_SECRET` - サーバーサイド環境変数

❌ **公開してはいけない情報**:
- チャネルシークレット
- アクセストークン（キャッシュ）

### 3. アクセストークン管理

✅ **有効期限チェック**: 期限切れトークンの自動リフレッシュ

```typescript
if (tokenData.expires_in < 300) {
  // トークンリフレッシュロジック
}
```

✅ **Supabase内での保管**: 必要に応じて暗号化

### 4. レート制限

✅ **Vercel Cron**: スケジュール実行による制御

✅ **Webhook処理**: 非同期処理で素早く応答

### 5. エラーハンドリング

✅ **エラー詳細の非表示**: クライアント向けレスポンスで詳細を隠す

✅ **ログ記録**: サーバー側で詳細なエラーログを記録

---

## テスト計画

### Unit Tests

**対象**:
- `lib/line/validator.ts` - 署名検証ロジック
- `lib/line/messaging.ts` - メッセージ送信サービス
- `templates/lineMessages.ts` - テンプレート生成

```bash
npm test -- lib/line
```

### Integration Tests

**対象**:
- Webhook エンドポイント (`/api/line/webhook`)
- OAuth2 Callback (`/api/auth/line/callback`)
- リマインダー API (`/api/settings/reminder`)

```bash
npm test -- api/line
npm test -- api/auth/line
```

### E2E Tests

**シナリオ**:
1. LINE Login フロー
2. Webhook受信 → メッセージ処理
3. リマインダー設定 → 実行

### 手動テスト (ngrok使用)

```bash
# ターミナル1: アプリ起動
npm run dev

# ターミナル2: ngrok開始
ngrok http 3000

# LINE Developersコンソール:
# Webhook URL: https://xxx.ngrok.io/api/line/webhook

# LINEアプリから メッセージ送信してテスト
```

---

## デプロイメント計画

### ステージング環境

**デプロイ方法**: Vercel (自動)

**環境変数設定**:
```
LINE_CHANNEL_ACCESS_TOKEN=<staging_token>
LINE_CHANNEL_SECRET=<staging_secret>
NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID=<staging_id>
LINE_LOGIN_CHANNEL_SECRET=<staging_secret>
```

**Webhook URL設定**:
```
https://reflecthub-staging.vercel.app/api/line/webhook
```

### 本番環境

**デプロイ方法**: Vercel (本番)

**環境変数設定**:
```
LINE_CHANNEL_ACCESS_TOKEN=<prod_token>
LINE_CHANNEL_SECRET=<prod_secret>
NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID=<prod_id>
LINE_LOGIN_CHANNEL_SECRET=<prod_secret>
```

**Webhook URL設定**:
```
https://reflecthub.vercel.app/api/line/webhook
```

**Cron設定** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 実装チェックリスト

- [ ] 環境変数設定確認
- [ ] Webhook署名検証テスト
- [ ] OAuth2 フロー テスト
- [ ] メッセージ送受信テスト
- [ ] エラーハンドリング確認
- [ ] ログ記録確認
- [ ] 本番データベース マイグレーション
- [ ] LINE側チャネル設定更新
- [ ] 監視・ロギング設定
- [ ] ドキュメント更新

---

## 実装タイムライン

| フェーズ | 内容 | 期間 | 人数 |
|---------|------|------|------|
| 1 | LINE環境構築 | 4h | 1 |
| 2 | 開発環境セットアップ | 2h | 1 |
| 3 | OAuth2認証フロー | 3h | 1 |
| 4 | Webhook処理 | 2h | 1 |
| 5 | メッセージ送信機能 | 4h | 1 |
| 6 | リッチメニュー実装 | 4h | 1 |
| 7 | リマインダー基盤 | 4h | 1 |
| **合計** | | **23時間** | |

---

## 参考リソース

- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [LINE Login ドキュメント](https://developers.line.biz/ja/docs/line-login/)
- [LINE Bot SDK (Node.js)](https://github.com/line/line-bot-sdk-nodejs)
- [Webhook検証](https://developers.line.biz/ja/docs/messaging-api/receiving-messages/#webhook-signature)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Status**: Ready for Implementation
