# Task 4.4 & 4.5: Webhookイベント処理 + メッセージ送信機能

**Type**: Task
**Priority**: Highest
**Phase**: Phase 2 - Day 9-10
**Estimated**: 6 hours (4.4: 2h + 4.5: 4h)
**Depends On**: Task 4.3 (LINE Login認証フロー)
**Status**: Not Started

## 📌 概要

LINE Webhook イベント処理を実装し、ユーザーからのメッセージを受信・処理する。同時にメッセージ送信機能を構築し、プッシュメッセージやリプライメッセージを送信できるようにする。

---

## 🎯 Task 4.4: Webhookイベント処理（2時間）

### 4.4.1 イベント処理メインハンドラ実装

#### ファイル: `src/lib/line/webhook.ts`

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
 *
 * すべてのイベントタイプをディスパッチします
 */
export async function handleLineEvent(event: WebhookEvent): Promise<void> {
  console.log(`[Webhook] Processing event: ${event.type}`, {
    timestamp: event.timestamp,
    userId: event.source?.userId,
  });

  try {
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
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
        break;

      default:
        console.log(`[Webhook] Unknown event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error handling ${event.type}:`, error);
    // イベント処理エラーは LINE に 200 を返すため、ここでは例外を投げない
  }
}

/**
 * メッセージイベント処理
 *
 * ユーザーがテキスト・画像・位置情報などを送信した場合
 */
async function handleMessage(event: MessageEvent): Promise<void> {
  const { replyToken, source, message } = event;

  // テキストメッセージのみ処理
  if (message.type !== 'text') {
    console.log(`[Message] Ignoring non-text message: ${message.type}`);
    return;
  }

  const text = message.text.toLowerCase().trim();
  const userId = source.userId!;

  console.log(`[Message] Received from ${userId}: ${text}`);

  // キーワード判定と応答
  if (
    text.includes('振り返り') ||
    text.includes('ふりかえり') ||
    text.includes('reflection') ||
    text === 'r'
  ) {
    await handleReflectionKeyword(replyToken);
  } else if (
    text.includes('help') ||
    text.includes('ヘルプ') ||
    text.includes('サポート') ||
    text === 'h'
  ) {
    await handleHelpKeyword(replyToken);
  } else if (text === 'test' && process.env.NODE_ENV === 'development') {
    // 開発時テスト用
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: 'テストメッセージ受信しました ✅\n\nこのボットはテスト中です。',
    });
  } else {
    // デフォルト応答
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: 'ReflectHubへようこそ！\n\n「振り返り」と入力するか、\nメニューから機能を選択してください。\n\n「ヘルプ」で使い方が表示されます。',
    });
  }
}

/**
 * Follow イベント処理
 *
 * ユーザーがボットをフォロー（友達追加）した場合
 */
async function handleFollow(event: FollowEvent): Promise<void> {
  const userId = event.source.userId!;

  try {
    console.log(`[Follow] User followed: ${userId}`);

    // 1. ウェルカムメッセージ送信
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

    // 2. Supabase にフォロー情報を記録
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        line_follow_status: 'followed',
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', userId);

    if (error) {
      console.warn(`[Follow] Failed to update profile: ${error.message}`);
    }
  } catch (error) {
    console.error('[Follow] Error handling follow event:', error);
  }
}

/**
 * Unfollow イベント処理
 *
 * ユーザーがボットをブロック（削除）した場合
 */
async function handleUnfollow(event: FollowEvent): Promise<void> {
  const userId = event.source.userId!;

  try {
    console.log(`[Unfollow] User unfollowed: ${userId}`);

    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        line_follow_status: 'unfollowed',
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', userId);

    if (error) {
      console.warn(`[Unfollow] Failed to update profile: ${error.message}`);
    }
  } catch (error) {
    console.error('[Unfollow] Error handling unfollow event:', error);
  }
}

/**
 * Postback イベント処理
 *
 * リッチメニューボタン、アクション、クイックリプライなどをタップ
 */
async function handlePostback(event: PostbackEvent): Promise<void> {
  const { replyToken, source, postback } = event;
  const data = postback.data;

  console.log(`[Postback] Data: ${data}`);

  switch (data) {
    case 'snooze_1hour':
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: '了解しました！1時間後にリマインドします。\n🔔 次の通知をお待ちください。',
      });
      break;

    case 'menu_reflection':
      await handleReflectionKeyword(replyToken);
      break;

    case 'menu_history':
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: '📝 振り返り履歴を表示します',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: '履歴を見る',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/history`,
              },
            },
          ],
        },
      });
      break;

    case 'menu_settings':
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: '⚙️ 設定ページを開きます',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: '設定を開く',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
              },
            },
          ],
        },
      });
      break;

    default:
      console.log(`[Postback] Unknown data: ${data}`);
  }
}

/**
 * Beacon イベント処理
 *
 * iBeacon 送信範囲内に入った場合
 */
async function handleBeacon(event: BeaconEvent): Promise<void> {
  const { replyToken, beacon } = event;

  console.log(`[Beacon] Major: ${beacon.major}, Minor: ${beacon.minor}`);

  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: 'ビーコンを検知しました。\n\n何かお手伝いできることはありますか？',
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

**実装チェック**:
```typescript
[ ] すべてのイベントタイプがハンドルされている
[ ] メッセージキーワード判定が正確である
[ ] Supabase 更新が実装されている
[ ] エラーハンドリングが完全である
[ ] ログ出力が適切である
[ ] TYPE は正確である
```

---

## 🎯 Task 4.5: メッセージ送信機能（4時間）

### 4.5.1 メッセージング管理サービス実装

#### ファイル: `src/lib/line/messaging.ts`

```typescript
import { lineClient } from './client';
import { createClient } from '@/lib/supabase/server';
import {
  TextMessage,
  FlexMessage,
  QuickReply,
  TemplateMessage,
} from '@line/bot-sdk';

export type MessageType = 'push' | 'reply' | 'multicast' | 'broadcast';

interface MessageLog {
  user_id?: string;
  message_type: MessageType;
  status: 'sent' | 'failed';
  error_message?: string;
  sent_at: string;
}

/**
 * LINE メッセージング管理サービス
 *
 * Push, Reply, Multicast メッセージの送信を管理
 */
export class LineMessagingService {
  /**
   * Push Message を単一ユーザーに送信
   *
   * @param userId - LINEユーザーID
   * @param message - LINE メッセージオブジェクト
   * @param shouldLog - ログ記録するかどうか
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

      console.log(`[Message] Push message sent to ${userId}`);
    } catch (error) {
      console.error(`[Message] Failed to send push message to ${userId}:`, error);

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
   *
   * @param replyToken - LINE replyToken
   * @param message - LINE メッセージオブジェクト
   */
  static async sendReplyMessage(replyToken: string, message: any): Promise<void> {
    try {
      await lineClient.replyMessage(replyToken, message);
      console.log('[Message] Reply message sent');
    } catch (error) {
      console.error('[Message] Failed to send reply message:', error);
      throw error;
    }
  }

  /**
   * Multicast Message を複数ユーザーに送信
   *
   * @param userIds - LINEユーザーID の配列
   * @param message - LINE メッセージオブジェクト
   */
  static async sendMulticastMessage(
    userIds: string[],
    message: any
  ): Promise<void> {
    try {
      await lineClient.multicast(userIds, message);
      console.log(`[Message] Multicast message sent to ${userIds.length} users`);
    } catch (error) {
      console.error('[Message] Failed to send multicast message:', error);
      throw error;
    }
  }

  /**
   * Broadcast Message を全ユーザーに送信（有料API）
   *
   * @param message - LINE メッセージオブジェクト
   */
  static async sendBroadcastMessage(message: any): Promise<void> {
    try {
      await lineClient.broadcast(message);
      console.log('[Message] Broadcast message sent');
    } catch (error) {
      console.error('[Message] Failed to send broadcast message:', error);
      throw error;
    }
  }

  /**
   * メッセージログ記録
   */
  private static async logMessage(log: MessageLog): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('line_message_logs').insert({
        user_id: log.user_id,
        message_type: log.message_type,
        status: log.status,
        error_message: log.error_message,
        sent_at: log.sent_at,
      });
    } catch (error) {
      console.error('[Message] Failed to log message:', error);
      // ログ失敗は通常エラーにしない（送信には成功している）
    }
  }

  /**
   * 送信成功・失敗統計を取得
   */
  static async getMessageStats(
    fromDate: Date
  ): Promise<{ sent: number; failed: number }> {
    try {
      const supabase = await createClient();

      const { data: logs, error } = await supabase
        .from('line_message_logs')
        .select('status')
        .gte('sent_at', fromDate.toISOString());

      if (error) throw error;

      const sent = logs?.filter((l) => l.status === 'sent').length ?? 0;
      const failed = logs?.filter((l) => l.status === 'failed').length ?? 0;

      return { sent, failed };
    } catch (error) {
      console.error('[Message] Failed to get stats:', error);
      return { sent: 0, failed: 0 };
    }
  }
}
```

**実装チェック**:
```typescript
[ ] Push Message 実装完了
[ ] Reply Message 実装完了
[ ] Multicast Message 実装完了
[ ] Broadcast Message 実装完了
[ ] ログ記録実装完了
[ ] エラーハンドリング完全
[ ] 統計取得実装完了
```

---

### 4.5.2 メッセージテンプレート実装

#### ファイル: `src/templates/lineMessages.ts`

```typescript
import { TextMessage, FlexMessage } from '@line/bot-sdk';

/**
 * LINE リマインダーメッセージテンプレート
 */
export const reminderMessages = {
  /**
   * 基本テキストリマインダー
   */
  basic: (userName: string): TextMessage => ({
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
   * Flexメッセージ版リマインダー（リッチデザイン）
   */
  flexReminder: (userName: string): FlexMessage => ({
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
            type: 'box' as const,
            layout: 'vertical' as const,
            margin: 'md' as const,
            spacing: 'sm' as const,
            contents: [
              {
                type: 'text' as const,
                text: '📊 YWT または KPT で振り返り',
                size: 'sm' as const,
              },
              {
                type: 'text' as const,
                text: '⏰ 所要時間: 約3分',
                size: 'sm' as const,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'sm' as const,
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
          {
            type: 'button' as const,
            action: {
              type: 'postback' as const,
              label: '後で',
              data: 'snooze_1hour',
            },
            style: 'secondary' as const,
          },
        ],
      },
    },
  }),

  /**
   * 振り返り完了通知
   */
  reflectionComplete: (userName: string): TextMessage => ({
    type: 'text' as const,
    text: `${userName}さん、\n今週の振り返り、お疲れ様でした！\n\n🎯 来週も一緒に頑張りましょう！`,
  }),

  /**
   * ウェルカムメッセージ
   */
  welcome: (userName: string): TextMessage => ({
    type: 'text' as const,
    text: `${userName}さん、ReflectHubへようこそ！🎉\n\n毎週の振り返り習慣で、継続的な成長をサポートします。\n\nさっそく始めてみましょう！`,
  }),

  /**
   * 連続達成マイルストーン通知
   */
  streakMilestone: (userName: string, streak: number): TextMessage => ({
    type: 'text' as const,
    text: `🎉 ${userName}さん、素晴らしい！\n\n${streak}週連続で振り返りを完了されました！\n\nこの調子で習慣化を目指しましょう 💪`,
  }),

  /**
   * 設定変更確認
   */
  settingChanged: (setting: string, value: string): TextMessage => ({
    type: 'text' as const,
    text: `✅ 設定を変更しました\n\n${setting}: ${value}`,
  }),
};

/**
 * メッセージテンプレート ID 定義
 *
 * テンプレート識別用のキー
 */
export const messageTemplateIds = {
  WEEKLY_REMINDER: 'weekly_reminder',
  COMPLETION_NOTICE: 'completion_notice',
  WELCOME: 'welcome',
  STREAK_MILESTONE: 'streak_milestone',
  SETTING_CHANGED: 'setting_changed',
} as const;

/**
 * テンプレートタイプ
 */
export type MessageTemplate = keyof typeof messageTemplateIds;
```

**実装チェック**:
```typescript
[ ] すべてのテンプレートが実装されている
[ ] Flex メッセージ形式が正確である
[ ] Quick Reply が実装されている
[ ] テンプレートID が定義されている
[ ] TypeScript 型が正確である
```

---

## 📋 チェックリスト

### Webhook イベント処理
- [ ] handleLineEvent 実装完了
- [ ] handleMessage 実装完了
- [ ] handleFollow 実装完了
- [ ] handleUnfollow 実装完了
- [ ] handlePostback 実装完了
- [ ] handleBeacon 実装完了

### メッセージ送信機能
- [ ] LineMessagingService 実装完了
- [ ] Push Message 実装
- [ ] Reply Message 実装
- [ ] Multicast Message 実装
- [ ] ログ記録実装
- [ ] 統計取得実装

### メッセージテンプレート
- [ ] テキストテンプレート実装
- [ ] Flexメッセージテンプレート実装
- [ ] 完了通知テンプレート実装
- [ ] その他特殊テンプレート実装

### 統合テスト
- [ ] npm run lint エラーなし
- [ ] npm run build 成功
- [ ] Webhook エンドポイント動作確認
- [ ] メッセージ送信動作確認

---

## ✅ 完了条件

```
[ ] すべてのイベントハンドラ実装完了
[ ] メッセージング管理サービス完成
[ ] テンプレート実装完成
[ ] TypeScript エラーなし
[ ] npm run build 成功
[ ] ローカルテスト実施
[ ] ngrok/Webhookテスト実施
```

---

## 🧪 テスト方法（ngrok使用）

```bash
# ターミナル1: アプリ起動
npm run dev

# ターミナル2: ngrok トンネル開始
ngrok http 3000
# 出力例: https://abc123.ngrok.io

# LINE Developers コンソール:
# Webhook URL を設定: https://abc123.ngrok.io/api/line/webhook

# LINEアプリから メッセージ送信してテスト
# - テキスト送信
# - 振り返りキーワード
# - ヘルプキーワード
# - その他キーワード

# ローカルログで処理確認
```

---

## 🔗 参考リソース

- [Webhook イベント仕様](https://developers.line.biz/ja/docs/messaging-api/receiving-messages/)
- [メッセージ送信API](https://developers.line.biz/ja/docs/messaging-api/using-send-api/)
- [Flex Message](https://developers.line.biz/ja/docs/messaging-api/using-flex-message/)
- [Quick Reply](https://developers.line.biz/ja/docs/messaging-api/using-quick-reply/)

---

**Labels**: `line-integration`, `messaging`, `webhook`, `day-9`, `day-10`
**Assignee**: @hiiragi17
**Epic**: [EPIC] LINE連携実装 フェーズ2
**Milestone**: Phase 2 - LINE Integration
