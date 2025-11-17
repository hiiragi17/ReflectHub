# Task 4.3: LINE Login認証フロー実装

**Type**: Task
**Priority**: Highest
**Phase**: Phase 2 - Day 9
**Estimated**: 3 hours
**Depends On**: Task 4.2 (開発環境セットアップ)
**Status**: Not Started

## 📌 概要

LINE Loginボタンコンポーネントを実装し、OAuth2.1認証フローを構築する。ユーザーがLINEアカウントで安全にログインできるようにする。

## 🎯 詳細タスク

### 4.3.1 ログインボタンコンポーネント実装（45分）

#### ファイル: `src/components/auth/LineLoginButton.tsx`

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
  const [error, setError] = useState<string | null>(null);

  const handleLineLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. 必要なパラメータ取得
      const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (!channelId) {
        throw new Error('LINE_LOGIN_CHANNEL_ID is not configured');
      }

      if (!appUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL is not configured');
      }

      const redirectUri = `${appUrl}/auth/line/callback`;

      // 2. CSRF対策: State生成
      const state = generateRandomString(32);
      sessionStorage.setItem('line_auth_state', state);

      // 3. PKCE対策: Code Verifier生成（オプション・推奨）
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

      // 5. LINE認可画面にリダイレクト
      window.location.href = authUrl.toString();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'ログイン処理に失敗しました';

      console.error('LINE login error:', error);
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleLineLogin}
        disabled={isLoading}
        className={`
          flex items-center justify-center gap-2
          px-6 py-3 rounded-lg font-semibold
          bg-[#00B900] hover:bg-[#009900] text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        `}
        aria-label="LINE でログイン"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          {/* LINE Logo: 簡略版 */}
          <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M7.5,11L8.5,7.5H9.5L8.5,11M10,11L11,7.5H12L11,11M13,11L14,7.5H15L14,11M16.5,11L17.5,7.5H18.5L17.5,11" />
        </svg>
        {isLoading ? 'ログイン中...' : 'LINEでログイン'}
      </button>

      {error && (
        <p className="text-red-500 text-sm text-center">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

/**
 * クリプトセキュアなランダム文字列生成
 *
 * @param length - 生成する文字列の長さ
 * @returns ランダム文字列
 */
function generateRandomString(length: number): string {
  // PKCE に準拠した文字セット
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);

  // Crypto API を使用してセキュアに生成
  if (typeof window !== 'undefined' && window.crypto) {
    crypto.getRandomValues(array);
  } else {
    // フォールバック（本番環境では非推奨）
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * chars.length);
    }
  }

  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

export default LineLoginButton;
```

**実装チェック**:
```typescript
[ ] OAuth2.1 Authorization URL が正確に構築されている
[ ] State が sessionStorage に保存されている
[ ] 環境変数チェックが実装されている
[ ] エラーハンドリングが完全である
[ ] クライアント側コンポーネントである ('use client')
[ ] TypeScript 型が正確である
```

---

### 4.3.2 認証コールバック処理（90分）

#### ファイル: `src/app/auth/line/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncLineUserProfile } from '@/lib/line/auth';

/**
 * LINE OAuth2.1 Callback Handler
 *
 * GET /auth/line/callback
 *
 * ユーザーが LINE ログイン認可画面で「許可」をクリック後、
 * LINEから Authorization コードを受け取りこのエンドポイントにリダイレクトされます
 *
 * https://developers.line.biz/ja/docs/line-login/integrate-line-login/
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // 1. エラー処理
    if (error) {
      console.error('LINE OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`,
          request.url
        )
      );
    }

    // 2. 必要なパラメータチェック
    if (!code || !state) {
      console.error('Missing required parameters:', { code, state });
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_parameters', request.url)
      );
    }

    // 3. CSRF検証（State確認）
    const storedState = request.cookies.get('line_auth_state')?.value;
    if (!storedState || state !== storedState) {
      console.error('State mismatch - possible CSRF attack');
      return NextResponse.redirect(
        new URL('/auth/error?error=state_mismatch', request.url)
      );
    }

    // 4. LINE からのアクセストークン取得
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;

    if (!appUrl || !channelId || !channelSecret) {
      console.error('Missing LINE credentials');
      return NextResponse.redirect(
        new URL('/auth/error?error=server_config_error', request.url)
      );
    }

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
          redirect_uri: `${appUrl}/auth/line/callback`,
          client_id: channelId,
          client_secret: channelSecret,
        }).toString(),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const errorMsg = tokenData.error_description || 'Token request failed';
      console.error('Token request failed:', errorMsg);
      throw new Error(errorMsg);
    }

    // 5. LINE からユーザープロフィール取得
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Profile request failed:', profileResponse.status);
      throw new Error('Failed to fetch LINE profile');
    }

    const lineProfile = await profileResponse.json();

    // 6. Supabase ユーザー作成/更新
    const supabase = await createClient();
    await syncLineUserProfile(supabase, lineProfile, tokenData);

    // 7. ダッシュボードへリダイレクト
    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    );

    // State Cookie をクリア
    response.cookies.delete('line_auth_state');

    return response;
  } catch (error) {
    console.error('LINE login callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=auth_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : 'Unknown error'
        )}`,
        request.url
      )
    );
  }
}
```

**実装チェック**:
```typescript
[ ] Authorization Code を正確に処理している
[ ] State 検証が実装されている
[ ] トークンリクエストが正確である
[ ] エラーハンドリングが完全である
[ ] ユーザープロフィール取得が実装されている
[ ] Supabase 同期が実行されている
[ ] リダイレクト先が適切である
```

---

### 4.3.3 ユーザープロフィール管理（45分）

#### ファイル: `src/lib/line/auth.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
  id_token?: string;
}

/**
 * LINEユーザープロフィールを Supabase に同期
 *
 * 既存ユーザーなら更新、新規なら作成します
 */
export async function syncLineUserProfile(
  supabase: SupabaseClient,
  lineProfile: LineProfile,
  tokenData: LineTokenData
) {
  // 1. 既存ユーザーチェック
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id, auth_id')
    .eq('line_user_id', lineProfile.userId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    // PGRST116 = "not found" (正常)
    throw selectError;
  }

  if (existingProfile) {
    // 2a. 既存ユーザー更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: lineProfile.displayName,
        avatar_url: lineProfile.pictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', lineProfile.userId);

    if (updateError) throw updateError;

    console.log(`Updated existing LINE user: ${lineProfile.userId}`);
    return { success: true, isNewUser: false };
  } else {
    // 2b. 新規ユーザー作成
    // LINE IDのみを使用した仮のメールアドレスを生成
    const tempEmail = `line_${lineProfile.userId}@line.local`;

    // セキュアなランダムパスワード生成
    const tempPassword = generateRandomPassword(16);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: tempEmail,
      password: tempPassword,
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

    if (!signUpData.user) {
      throw new Error('Failed to create user in Supabase');
    }

    // プロフィール テーブルに記録
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: signUpData.user.id,
        line_user_id: lineProfile.userId,
        name: lineProfile.displayName,
        avatar_url: lineProfile.pictureUrl,
        provider: 'line',
      });

    if (profileError) throw profileError;

    console.log(`Created new LINE user: ${lineProfile.userId}`);
    return { success: true, isNewUser: true };
  }
}

/**
 * セキュアなランダムパスワード生成
 *
 * @param length - パスワード長
 * @returns ランダムパスワード
 */
function generateRandomPassword(length: number): string {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';

  const array = new Uint8Array(length);

  // Node.js 環境用 crypto
  if (typeof require !== 'undefined') {
    const crypto = require('crypto');
    crypto.randomFillSync(array);
  } else {
    // フォールバック
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

/**
 * LINEアクセストークンの有効期限をチェック
 */
export function isTokenExpired(tokenData: LineTokenData): boolean {
  // expires_in は秒単位
  // 5分以内に期限切れ予定なら更新推奨
  return tokenData.expires_in < 300;
}

/**
 * ID Tokenをデコード（署名検証なし）
 * 実装者注：署名検証は本番では必須
 */
export function decodeIdToken(idToken: string): Record<string, unknown> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format');
  }

  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64').toString()
  );

  return payload;
}
```

**実装チェック**:
```typescript
[ ] LINE ユーザーID を LINE_USER_ID カラムに保存している
[ ] 既存ユーザーの検出が正確である
[ ] 新規ユーザー作成時にランダムパスワードを生成している
[ ] エラーハンドリングが完全である
[ ] Supabase トランザクションが適切である
[ ] TypeScript 型が正確である
```

---

## 📋 チェックリスト

### コンポーネント実装
- [ ] LineLoginButton.tsx 実装完了
- [ ] クライアント側コンポーネント設定確認
- [ ] OAuth2.1 フロー正確に実装
- [ ] State CSRF対策実装
- [ ] エラーハンドリング実装

### Callback エンドポイント
- [ ] route.ts 実装完了
- [ ] Authorization Code 処理正確
- [ ] State 検証実装
- [ ] トークン取得実装
- [ ] プロフィール取得実装
- [ ] エラーハンドリング完全

### ユーザー管理
- [ ] auth.ts 実装完了
- [ ] ユーザー同期実装
- [ ] パスワード生成実装
- [ ] 既存・新規判定ロジック正確
- [ ] Supabase 設定確認

### 統合テスト
- [ ] npm run lint エラーなし
- [ ] npm run build 成功
- [ ] TypeScript エラーなし
- [ ] ローカル起動確認

---

## ✅ 完了条件

```
[ ] LineLoginButton コンポーネント完成
[ ] OAuth2 Callback エンドポイント完成
[ ] ユーザー同期ロジック完成
[ ] TypeScript エラーなし
[ ] npm run build 成功
[ ] ローカル起動で動作確認
[ ] LINE ログイン画面が表示される
```

---

## 🔗 参考リソース

- [LINE Login ドキュメント](https://developers.line.biz/ja/docs/line-login/)
- [OAuth2.1 仕様](https://tools.ietf.org/html/draft-ietf-oauth-v2-1)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)

---

## 📝 実装ノート

### State パラメータについて

State パラメータはCSRF攻撃を防ぐために必須です：

```typescript
// Step 1: ボタンクリック時に生成
const state = generateRandomString(32);
sessionStorage.setItem('line_auth_state', state);

// Step 2: Callback 時に検証
const storedState = sessionStorage.getItem('line_auth_state');
if (state !== storedState) {
  // CSRF 攻撃の可能性
  throw new Error('State mismatch');
}
```

### 仮のメールアドレスについて

LINE ID のみでログインする場合、メールアドレスは不明です。
仮メール `line_<USER_ID>@line.local` を使用しますが、
将来的にメールアドレスが必要になる場合は、
別途メールアドレス入力フローを追加してください。

---

**Labels**: `line-integration`, `auth`, `oauth2`, `day-9`
**Assignee**: @hiiragi17
**Epic**: [EPIC] LINE連携実装 フェーズ2
**Milestone**: Phase 2 - LINE Integration
