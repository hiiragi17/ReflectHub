# Task 4.6 & 4.7: リッチメニュー実装 + リマインダー基盤

**Type**: Task
**Priority**: Highest
**Phase**: Phase 2 - Day 11
**Estimated**: 8 hours (4.6: 4h + 4.7: 4h)
**Depends On**: Task 4.5 (メッセージ送信機能)
**Status**: Not Started

## 📌 概要

LINE リッチメニュー（ボタンメニュー）を実装し、ユーザーが簡単に主要機能にアクセスできるようにする。同時に、定期的なリマインダー送信機能を構築し、Vercel Cronで自動実行させる。

---

## 🎯 Task 4.6: リッチメニュー実装（4時間）

### 6.1 リッチメニュー設計

#### メニュー構成（2×3グリッド）

```
┌─────────────────────────────────┐
│  📝 今日の振り返り │ 📅 履歴を見る  │
├─────────────────────────────────┤
│  ⚙️ 設定       │ 📊 統計      │
├─────────────────────────────────┤
│  ❓ ヘルプ     │ 🔗 Webアプリ  │
└─────────────────────────────────┘

全体サイズ: 1040×1040px
各セル: 520×347px
```

### 6.2 リッチメニュー画像作成

#### 作成手順

1. **デザイン作成**:
   - Figma/Photoshop/Canva で 1040×1040px の画像を作成
   - 2×3グリッド配置（各セル 520×347px）
   - 各セルにアイコン＋テキストを配置
   - 背景色: 白またはリーベッジカラー
   - フォント: 日本語対応（ヒラギノ角ゴ、Noto Sans JP など）

2. **推奨デザイン**:
   - スタイル: Notion風（シンプル・ミニマル）
   - フォントサイズ: テキスト 24-32px
   - 枠線: 薄いグレー（#EEEEEE）
   - ホバー効果: 必要なし（静的画像）

3. **出力設定**:
   - 形式: JPG または PNG
   - サイズ: 1040×1040px 以上
   - 圧縮: 最適化（200KB以下推奨）

4. **保存場所**:
   ```bash
   # 公開ディレクトリに配置
   public/rich-menu.jpg
   ```

**チェックリスト**:
```
[ ] リッチメニュー画像作成完了
[ ] 1040×1040px で保存
[ ] public/rich-menu.jpg に配置
[ ] JPG/PNG形式確認
[ ] ファイルサイズ 200KB以下
```

---

### 6.3 リッチメニュー API設定実装

#### ファイル: `src/lib/line/richMenu.ts`

```typescript
/**
 * LINE リッチメニュー管理
 *
 * リッチメニューの作成、更新、画像アップロードを管理
 */
import { lineClient } from './client';
import fs from 'fs';
import path from 'path';

export interface RichMenuArea {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  action: {
    type: 'uri' | 'postback' | 'message';
    [key: string]: any;
  };
}

export interface RichMenuConfig {
  size: {
    width: number;
    height: number;
  };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
}

/**
 * デフォルトリッチメニュー設定
 */
export const defaultRichMenuConfig: RichMenuConfig = {
  size: {
    width: 1040,
    height: 1040,
  },
  selected: true,
  name: 'ReflectHub Main Menu',
  chatBarText: 'メニューを開く',
  areas: [
    // 今日の振り返り（左上）
    {
      bounds: {
        x: 0,
        y: 0,
        width: 520,
        height: 347,
      },
      action: {
        type: 'uri',
        uri: `${process.env.NEXT_PUBLIC_APP_URL}/reflection`,
        label: '振り返りを開く',
      },
    },

    // 履歴を見る（右上）
    {
      bounds: {
        x: 520,
        y: 0,
        width: 520,
        height: 347,
      },
      action: {
        type: 'uri',
        uri: `${process.env.NEXT_PUBLIC_APP_URL}/history`,
        label: '履歴を開く',
      },
    },

    // 設定（左中）
    {
      bounds: {
        x: 0,
        y: 347,
        width: 520,
        height: 346,
      },
      action: {
        type: 'uri',
        uri: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        label: '設定を開く',
      },
    },

    // 統計（右中）
    {
      bounds: {
        x: 520,
        y: 347,
        width: 520,
        height: 346,
      },
      action: {
        type: 'uri',
        uri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        label: 'ダッシュボード',
      },
    },

    // ヘルプ（左下）
    {
      bounds: {
        x: 0,
        y: 693,
        width: 520,
        height: 347,
      },
      action: {
        type: 'postback',
        data: 'help',
        label: 'ヘルプ',
      },
    },

    // Webアプリ（右下）
    {
      bounds: {
        x: 520,
        y: 693,
        width: 520,
        height: 347,
      },
      action: {
        type: 'uri',
        uri: process.env.NEXT_PUBLIC_APP_URL || 'https://reflecthub.com',
        label: 'Webアプリを開く',
      },
    },
  ],
};

/**
 * リッチメニュー作成
 *
 * @returns 作成されたリッチメニューID
 */
export async function createRichMenu(
  config: RichMenuConfig = defaultRichMenuConfig
): Promise<string> {
  try {
    console.log('[RichMenu] Creating rich menu...');

    const richMenuId = await lineClient.createRichMenu(config);

    console.log(`[RichMenu] Created: ${richMenuId}`);
    return richMenuId;
  } catch (error) {
    console.error('[RichMenu] Failed to create rich menu:', error);
    throw error;
  }
}

/**
 * リッチメニュー画像アップロード
 *
 * @param richMenuId - リッチメニューID
 * @param imagePath - 画像ファイルパス（絶対パス）
 */
export async function uploadRichMenuImage(
  richMenuId: string,
  imagePath: string
): Promise<void> {
  try {
    console.log('[RichMenu] Uploading image...');

    // ファイル存在確認
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // ファイル読み込み
    const imageBuffer = fs.readFileSync(imagePath);

    // アップロード
    await lineClient.setRichMenuImage(richMenuId, imageBuffer);

    console.log('[RichMenu] Image uploaded successfully');
  } catch (error) {
    console.error('[RichMenu] Failed to upload image:', error);
    throw error;
  }
}

/**
 * デフォルトリッチメニュー設定
 *
 * ユーザーがボットを開くたびにこのメニューが表示される
 *
 * @param richMenuId - リッチメニューID
 */
export async function setDefaultRichMenu(richMenuId: string): Promise<void> {
  try {
    console.log('[RichMenu] Setting default rich menu...');

    await lineClient.setDefaultRichMenu(richMenuId);

    console.log('[RichMenu] Default rich menu set');
  } catch (error) {
    console.error('[RichMenu] Failed to set default:', error);
    throw error;
  }
}

/**
 * リッチメニュー削除
 *
 * @param richMenuId - リッチメニューID
 */
export async function deleteRichMenu(richMenuId: string): Promise<void> {
  try {
    console.log('[RichMenu] Deleting rich menu...');

    await lineClient.deleteRichMenu(richMenuId);

    console.log('[RichMenu] Rich menu deleted');
  } catch (error) {
    console.error('[RichMenu] Failed to delete rich menu:', error);
    throw error;
  }
}

/**
 * リッチメニュー情報取得
 *
 * @param richMenuId - リッチメニューID
 */
export async function getRichMenuInfo(richMenuId: string): Promise<any> {
  try {
    const info = await lineClient.getRichMenu(richMenuId);
    return info;
  } catch (error) {
    console.error('[RichMenu] Failed to get rich menu info:', error);
    throw error;
  }
}

/**
 * デフォルトリッチメニュー取得
 */
export async function getDefaultRichMenu(): Promise<string | null> {
  try {
    const menuId = await lineClient.getDefaultRichMenuId();
    return menuId;
  } catch (error) {
    // エラーがリッチメニュー未設定の場合は null を返す
    if (error instanceof Error && error.message.includes('No default rich menu')) {
      return null;
    }
    console.error('[RichMenu] Failed to get default rich menu:', error);
    throw error;
  }
}
```

**実装チェック**:
```typescript
[ ] RichMenuConfig インターフェース定義完了
[ ] createRichMenu 実装完了
[ ] uploadRichMenuImage 実装完了
[ ] setDefaultRichMenu 実装完了
[ ] 他のヘルパー関数実装完了
[ ] エラーハンドリング完全
```

---

### 6.4 セットアップスクリプト（Node.js）

#### ファイル: `scripts/setupRichMenu.ts`

```typescript
/**
 * リッチメニューセットアップスクリプト
 *
 * 実行方法:
 * npx ts-node scripts/setupRichMenu.ts
 */

import {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
  deleteRichMenu,
  getDefaultRichMenu,
} from '../src/lib/line/richMenu';
import path from 'path';

async function main() {
  try {
    console.log('🚀 ReflectHub リッチメニューセットアップ開始...\n');

    // 1. 既存のデフォルトメニュー確認・削除
    console.log('1️⃣  既存メニュー確認...');
    const existingMenuId = await getDefaultRichMenu();

    if (existingMenuId) {
      console.log(`   既存メニュー: ${existingMenuId}`);
      console.log('   削除しています...');
      await deleteRichMenu(existingMenuId);
      console.log('   削除完了 ✓\n');
    } else {
      console.log('   既存メニューなし ✓\n');
    }

    // 2. リッチメニュー作成
    console.log('2️⃣  リッチメニュー作成...');
    const richMenuId = await createRichMenu();
    console.log(`   作成完了: ${richMenuId} ✓\n`);

    // 3. 画像アップロード
    console.log('3️⃣  画像アップロード...');
    const imagePath = path.join(process.cwd(), 'public', 'rich-menu.jpg');
    console.log(`   画像パス: ${imagePath}`);
    await uploadRichMenuImage(richMenuId, imagePath);
    console.log('   アップロード完了 ✓\n');

    // 4. デフォルト設定
    console.log('4️⃣  デフォルトメニュー設定...');
    await setDefaultRichMenu(richMenuId);
    console.log('   設定完了 ✓\n');

    console.log('✅ リッチメニューセットアップ完了！\n');
    console.log(`メニューID: ${richMenuId}`);
    console.log('LINEアプリを再起動してメニューを確認してください。');
  } catch (error) {
    console.error('❌ セットアップに失敗しました:', error);
    process.exit(1);
  }
}

main();
```

**実行コマンド**:
```bash
# TypeScript スクリプト実行
npx ts-node scripts/setupRichMenu.ts

# または package.json に追加:
"setup:rich-menu": "ts-node scripts/setupRichMenu.ts"
```

**チェックリスト**:
```
[ ] scripts/setupRichMenu.ts 作成完了
[ ] リッチメニュー画像が public/rich-menu.jpg に存在
[ ] setup スクリプト実行成功
[ ] LINE Developers コンソール確認: メニュー表示される
```

---

## 🎯 Task 4.7: リマインダー基盤実装（4時間）

### 7.1 リマインダー設定UI実装

#### ファイル: `src/components/settings/ReminderSettings.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM" format
  days: number[]; // 0=Sun, 6=Sat
  timezone: string;
  messageType: 'text' | 'flex';
}

/**
 * リマインダー設定コンポーネント
 *
 * ユーザーが通知タイミングと頻度をカスタマイズできます
 */
export default function ReminderSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: true,
    time: '18:00',
    days: [5], // Friday
    timezone: 'Asia/Tokyo',
    messageType: 'flex',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/reminder');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({
        type: 'error',
        text: '設定の読み込みに失敗しました',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '✅ 設定を保存しました',
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({
        type: 'error',
        text: '設定の保存に失敗しました',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setSettings((prev) => {
      const newDays = prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day];
      return { ...prev, days: newDays };
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        📨 リマインダー設定
      </h3>

      <div className="space-y-6">
        {/* 有効/無効 */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span>リマインダーを有効にする</span>
          </label>
        </div>

        {settings.enabled && (
          <>
            {/* 通知時間 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                通知時間
              </label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) =>
                  setSettings({ ...settings, time: e.target.value })
                }
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* 通知曜日 */}
            <div>
              <label className="block text-sm font-medium mb-3">
                通知曜日
              </label>
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => toggleDay(index)}
                    className={`
                      p-2 rounded-lg font-medium text-sm transition-colors
                      ${
                        settings.days.includes(index)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* メッセージタイプ */}
            <div>
              <label className="block text-sm font-medium mb-2">
                メッセージタイプ
              </label>
              <select
                value={settings.messageType}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    messageType: e.target.value as 'text' | 'flex',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="text">テキストメッセージ</option>
                <option value="flex">リッチメッセージ（推奨）</option>
              </select>
            </div>

            {/* タイムゾーン */}
            <div>
              <label className="block text-sm font-medium mb-2">
                タイムゾーン
              </label>
              <select
                value={settings.timezone}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Asia/Tokyo">日本 (Asia/Tokyo)</option>
                <option value="Asia/Shanghai">中国 (Asia/Shanghai)</option>
                <option value="Asia/Seoul">韓国 (Asia/Seoul)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </>
        )}

        {/* メッセージ表示 */}
        {message && (
          <div
            className={`p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 保存ボタン */}
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? '保存中...' : '設定を保存'}
        </Button>
      </div>
    </Card>
  );
}
```

**実装チェック**:
```typescript
[ ] ReminderSettings コンポーネント実装完了
[ ] フォーム要素すべて実装
[ ] 曜日選択ロジック正確
[ ] API連携実装完了
[ ] エラーハンドリング完全
```

---

### 7.2 リマインダー設定 API実装

#### ファイル: `src/app/api/settings/reminder/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/settings/reminder
 *
 * ユーザーのリマインダー設定を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // 設定が存在しない場合はデフォルト値を返す
      return NextResponse.json({
        enabled: true,
        time: '18:00',
        days: [5], // Friday
        timezone: 'Asia/Tokyo',
        messageType: 'flex',
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[API] Failed to get settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/reminder
 *
 * ユーザーのリマインダー設定を更新
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { enabled, time, days, timezone, messageType } = body;

    // バリデーション
    if (!time || !days || !timezone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 既存設定を確認
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingSettings) {
      // 更新
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          reminder_enabled: enabled,
          reminder_time: time,
          reminder_days: days,
          reminder_timezone: timezone,
          line_message_type: messageType,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } else {
      // 新規作成
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          reminder_enabled: enabled,
          reminder_time: time,
          reminder_days: days,
          reminder_timezone: timezone,
          line_message_type: messageType,
        });

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**実装チェック**:
```typescript
[ ] GET エンドポイント実装完了
[ ] POST エンドポイント実装完了
[ ] ユーザー認証チェック実装
[ ] バリデーション実装
[ ] エラーハンドリング完全
```

---

### 7.3 Vercel Cron設定

#### ファイル: `vercel.json`

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

**説明**:
```
schedule: "0 * * * *"
         ↓ ↓ ↓ ↓ ↓
        分 時 日 月 曜日

0 * * * * = 毎時間の00分に実行
0 18 * * * = 毎日18:00に実行
0 18 * * 5 = 毎週金曜日18:00に実行
```

---

### 7.4 Cron リマインダーエンドポイント実装

#### ファイル: `src/app/api/cron/reminders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LineMessagingService } from '@/lib/line/messaging';
import { reminderMessages } from '@/templates/lineMessages';

/**
 * GET /api/cron/reminders
 *
 * Vercel Cron により定期的に実行
 * リマインダー条件を満たすユーザーにメッセージを送信
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 簡易認証（本番ではトークンベース認証推奨）
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. 現在時刻と曜日を取得
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayOfWeek = now.getDay();

    // 2. リマインダー対象ユーザーを取得
    // 注: user_settings テーブルで:
    //   - reminder_enabled = true
    //   - reminder_time に現在時刻が一致
    //   - reminder_days に現在の曜日が含まれる
    //   - line_follow_status = 'followed'

    const { data: userSettings, error: selectError } = await supabase
      .from('user_settings')
      .select(
        `
        user_id,
        reminder_time,
        reminder_days,
        reminder_timezone,
        line_message_type,
        profiles:user_id (
          line_user_id,
          name,
          line_follow_status
        )
      `
      )
      .eq('reminder_enabled', true)
      .contains('reminder_days', [dayOfWeek]); // 配列フィルタ

    if (selectError) {
      console.error('[Cron] Query error:', selectError);
      throw selectError;
    }

    let sent = 0;
    let failed = 0;

    // 3. 各ユーザーのリマインダー条件を確認
    for (const setting of userSettings || []) {
      try {
        // 時間チェック（分単位で実行される Cron なので、時間のみチェック）
        const [targetHour] = setting.reminder_time.split(':').map(Number);

        if (targetHour !== currentHour) {
          continue; // 対象時刻ではない
        }

        // LINE ユーザーID確認
        const profile = Array.isArray(setting.profiles)
          ? setting.profiles[0]
          : setting.profiles;

        if (
          !profile?.line_user_id ||
          profile.line_follow_status !== 'followed'
        ) {
          continue; // LINE フォロー状態でない
        }

        // 4. メッセージ送信
        const message =
          setting.line_message_type === 'flex'
            ? reminderMessages.flexReminder(profile.name || 'ユーザー')
            : reminderMessages.basic(profile.name || 'ユーザー');

        await LineMessagingService.sendPushMessage(
          profile.line_user_id,
          message,
          true // ログ記録
        );

        sent++;
      } catch (error) {
        console.error(
          `[Cron] Failed to send reminder to user:`,
          error
        );
        failed++;
      }
    }

    // 5. 統計ログ
    console.log(`[Cron] Reminders sent: ${sent}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Unexpected error:', error);

    // Cron は必ず 200 を返す（リトライ防止）
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    );
  }
}
```

**実装チェック**:
```typescript
[ ] Cron エンドポイント実装完了
[ ] ユーザー設定取得ロジック正確
[ ] メッセージ送信ロジック正確
[ ] エラーハンドリング完全
[ ] ログ出力適切
```

---

## 📋 チェックリスト

### リッチメニュー
- [ ] メニュー画像作成完了
- [ ] public/rich-menu.jpg に配置
- [ ] richMenu.ts 実装完了
- [ ] setupRichMenu.ts スクリプト実装完了
- [ ] セットアップスクリプト実行成功
- [ ] LINE メニュー表示確認

### リマインダー設定UI
- [ ] ReminderSettings コンポーネント実装完了
- [ ] フォーム機能完成
- [ ] API連携動作確認
- [ ] 設定保存動作確認

### リマインダーAPI
- [ ] /api/settings/reminder GET 実装完了
- [ ] /api/settings/reminder POST 実装完了
- [ ] バリデーション実装
- [ ] エラーハンドリング完全

### Cron リマインダー
- [ ] vercel.json 設定完了
- [ ] /api/cron/reminders 実装完了
- [ ] スケジュール時刻計算正確
- [ ] メッセージテンプレート選択ロジック正確
- [ ] ログ記録完成

### 統合テスト
- [ ] npm run lint エラーなし
- [ ] npm run build 成功
- [ ] ローカル動作確認
- [ ] Vercel デプロイ確認

---

## ✅ 完了条件

```
[ ] リッチメニュー完全実装
[ ] メニューが LINE で表示される
[ ] リマインダー設定UI 完成
[ ] API エンドポイント動作確認
[ ] Cron 設定完了
[ ] ローカルテスト成功
[ ] Vercel デプロイメント完了
[ ] リマインダー送信確認
[ ] TypeScript エラーなし
[ ] npm run build 成功
```

---

## 🧪 テスト方法

### ローカルテスト（Cron模擬）

```bash
# 直接エンドポイントを呼び出してテスト
curl -X GET http://localhost:3000/api/cron/reminders \
  -H "Authorization: Bearer your_cron_secret"
```

### 本番テスト（Vercel）

```bash
# Vercel ダッシュボード:
# Project → Settings → Crons
# cron/reminders の実行ログを確認
```

### 手動テスト（ngrok使用）

```bash
# ローカルで設定を変更して時間を進める
# または明日の時刻に設定して待機
```

---

## 🔗 参考リソース

- [Vercel Crons](https://vercel.com/docs/crons)
- [LINE Rich Menu API](https://developers.line.biz/ja/docs/messaging-api/using-rich-menu/)
- [Cron Expression Syntax](https://crontab.guru/)

---

**Labels**: `line-integration`, `messaging`, `ui`, `cron`, `day-11`
**Assignee**: @hiiragi17
**Epic**: [EPIC] LINE連携実装 フェーズ2
**Milestone**: Phase 2 - LINE Integration
