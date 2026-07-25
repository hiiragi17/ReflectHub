# 実装プラン: `daily-reminder` → `weekly-reminder` リネーム

## 目的

リマインダーは現在「週次」仕様(ユーザーが選んだ曜日・時刻に週 1 回配信)だが、エンドポイント名・pg_cron ジョブ名・SQL ファイル名・通知 tag が `daily-reminder` のままで実態とズレている。命名を実態に合わせて `weekly-reminder` に統一する。

- **新しい名前**: `weekly-reminder`(エンドポイント `/api/cron/weekly-reminder`、ジョブ名 `weekly-reminder`)
- 別スレッドで実装する前提の作業指示書。

## ⚠️ 重要: 触ってはいけないもの(誤爆注意)

`daily_reminder`(**アンダースコア**)は、旧データモデルの `notification_preferences` に存在した**レガシー JSON キー**で、今回のリネームとは**完全に無関係**。以下は**絶対に変更しないこと**:

- `database/notification-preferences-weekday.sql`(3, 23, 29 行目付近の `daily_reminder` / 旧フォーマット migration)
- `src/lib/push/validation.test.ts`(11 行目 `daily_reminder: true` — 不明キーが拒否されることを検証するテスト)

今回のリネーム対象は、ハイフン区切りの `daily-reminder`(エンドポイント/ジョブ/ファイル)と、通知 tag の `reflecthub-daily-reminder` のみ。

## 影響しないことを確認済みのもの

- **`middleware.ts`**: 認証除外は `/api/cron/`(プレフィックス)で判定しているため、パス末尾が変わっても**修正不要**。
- **`vercel.json`**: `{}`(空)。Vercel Cron はすでに廃止済みで cron 定義なし。**修正不要**。
- **cron route の単体テスト**: `src/app/api/cron/daily-reminder/` には `route.ts` のみでテストファイルは無い。

---

## 作業手順

### フェーズ 1: コード変更

#### 1-1. ルートディレクトリのリネーム
```
git mv src/app/api/cron/daily-reminder src/app/api/cron/weekly-reminder
```

#### 1-2. `src/app/api/cron/weekly-reminder/route.ts` の中身
- JSDoc の `GET /api/cron/daily-reminder` → `GET /api/cron/weekly-reminder`
- コメント内の `database/daily-reminder-pg-cron.sql` 参照 → `database/weekly-reminder-pg-cron.sql`
- ログ接頭辞 `[daily-reminder]`(5 箇所: push failed / markUserNotified failed / target processing failed / deactivateSubscriptions failed / cron failed)→ `[weekly-reminder]`
- コメント「毎時 0 分に呼び出される」等の記述はそのまま(仕様は変わらない)

#### 1-3. `src/services/reminderService.ts`
- 10 行目付近: コメント `database/daily-reminder-pg-cron.sql を参照` → `weekly-reminder-pg-cron.sql`
- 45 行目: 通知 tag `tag: 'reflecthub-daily-reminder'` → `tag: 'reflecthub-weekly-reminder'`
  - ※ tag は通知のグルーピング用途で後方互換の懸念はないが、統一のため変更する。

#### 1-4. `middleware.test.ts`
- 131, 154 行目付近: テスト内の `pathname: '/api/cron/daily-reminder'` → `/api/cron/weekly-reminder`(2 箇所)

### フェーズ 2: SQL / DB マイグレーション定義

#### 2-1. SQL ファイルのリネーム
```
git mv database/daily-reminder-pg-cron.sql database/weekly-reminder-pg-cron.sql
```

#### 2-2. `database/weekly-reminder-pg-cron.sql` の中身
- ジョブ名 `'daily-reminder'` → `'weekly-reminder'`(`cron.schedule` の第 1 引数、`cron.unschedule`、`where jobname = ...` の判定)
- **旧ジョブの後始末を追加**: 新スクリプトの `unschedule` は新ジョブ名を対象にするため、既存の `daily-reminder` ジョブが残る。スクリプト冒頭に旧ジョブの unschedule を 1 行追加すること:
  ```sql
  select cron.unschedule('daily-reminder')
  where exists (select 1 from cron.job where jobname = 'daily-reminder');
  ```
- コメント/エラーメッセージ内のファイル名 `daily-reminder-pg-cron.sql` → `weekly-reminder-pg-cron.sql`
- プレースホルダ URL とコメントの `/api/cron/daily-reminder` → `/api/cron/weekly-reminder`(39, 44 行目のプレースホルダ判定文字列も合わせる。判定文字列とデフォルト値がズレると fail-fast ロジックが壊れるので注意)

#### 2-3. `database/notification-preferences-hour.sql`
- 8 行目付近: コメント `daily-reminder-pg-cron.sql` 参照 → `weekly-reminder-pg-cron.sql`

#### 2-4. `database/README.md`
- SQL ファイル名 `daily-reminder-pg-cron.sql`、ジョブ名 `daily-reminder`、エンドポイント URL `/api/cron/daily-reminder` の各参照を更新(54, 65, 67, 70, 91, 92 行目付近)

### フェーズ 3: ドキュメント更新

#### 3-1. `docs/pwa-and-notifications.md`
- 本文・mermaid・コードブロック・関連ファイル表の `daily-reminder` 参照を一括更新(288, 390, 394, 398, 426, 459, 588, 592 行目付近)
- **「命名についての注意」コールアウト(390 行目付近)を削除または書き換え**: リネーム後は「daily 命名は日次だった名残」という補足が不要になる。代わりに一言「エンドポイント名も実態に合わせ `weekly-reminder` に統一済み」程度に。
- payload の `"tag": "reflecthub-daily-reminder"` → `reflecthub-weekly-reminder`

---

## フェーズ 4: 本番反映(運用・ここが要注意)

コードのデプロイだけでは完結しない。**pg_cron は Vault に保存された URL を叩く**ため、以下を順序立てて行わないと配信が止まる/404 になる。

### 反映順序(通知の欠損を避ける)

1. **コードをデプロイ**(新ルート `/api/cron/weekly-reminder` が本番で有効になる)
   - この時点では pg_cron はまだ旧 URL(`/api/cron/daily-reminder`)を叩いており、旧ルートは消えているため **404 になる**。この空白を避けたい場合は下記「安全策」を参照。
2. **Supabase SQL Editor で `weekly-reminder-pg-cron.sql` を実行**
   - Vault シークレット `reminder_endpoint_url` が新 URL(`.../api/cron/weekly-reminder`)に更新される(スクリプト内の `v_url` を新パスにして実行)。
   - 旧ジョブ `daily-reminder` が unschedule され、新ジョブ `weekly-reminder` が登録される。
3. **確認**:
   - `select jobid, jobname, schedule, command from cron.job;` に `weekly-reminder` があり `daily-reminder` が無いこと。
   - `select decrypted_secret from vault.decrypted_secrets where name = 'reminder_endpoint_url';` が新 URL であること。
   - 次の毎時 0 分の後、`select * from cron.job_run_details order by start_time desc limit 5;` で成功していること。

### 安全策(配信の空白を作りたくない場合、任意)

手順 1〜2 の間、旧 URL が 404 になる時間帯が生じる。厳密にゼロにしたいなら:

- **案 A(推奨・シンプル)**: 配信時刻から外れた時間帯(対象ユーザーがいない時刻)にデプロイ + SQL 実行をまとめて行う。毎時 0 分の空振りが 1 回 404 になるだけで実害なし。
- **案 B(無停止)**: 旧ルート `src/app/api/cron/daily-reminder/route.ts` を一旦残し、新ルートを追加 → Vault + ジョブを新 URL に切替 → 数日後に旧ルートを削除、の 2 段階デプロイ。手間は増えるが配信の空白ゼロ。

> 通常は案 A で十分。ReflectHub は同日重複を `last_notified_at` で防いでおり、毎時起動なので 1 時間内の一時的な 404 が致命傷にはならない(対象ユーザーがその 1 時間に居なければ影響ゼロ)。

---

## 検証チェックリスト

- [ ] `grep -rniI "daily.reminder" src/ database/ docs/ middleware.test.ts` の残りが、意図した箇所ゼロ(レガシー `daily_reminder` アンダースコアのみ残る)
- [ ] `daily_reminder`(アンダースコア)は `notification-preferences-weekday.sql` と `validation.test.ts` に**残っている**こと(消していないこと)
- [ ] `pnpm test`(または該当プロジェクトのテストコマンド)が green
- [ ] `pnpm build` / typecheck が通る(ルートディレクトリ移動で参照切れが無いこと)
- [ ] 本番デプロイ後、Supabase で新ジョブ稼働・Vault URL 更新・実行成功を確認

## 対象ファイル一覧(まとめ)

| ファイル | 変更内容 |
| --- | --- |
| `src/app/api/cron/daily-reminder/` → `weekly-reminder/` | ディレクトリ rename |
| `src/app/api/cron/weekly-reminder/route.ts` | JSDoc・コメント・ログ接頭辞 |
| `src/services/reminderService.ts` | コメント参照・通知 tag |
| `middleware.test.ts` | テストのパス文字列 ×2 |
| `database/daily-reminder-pg-cron.sql` → `weekly-reminder-pg-cron.sql` | ファイル rename + ジョブ名・URL・旧ジョブ unschedule 追加 |
| `database/notification-preferences-hour.sql` | コメント参照 |
| `database/README.md` | ファイル名・ジョブ名・URL 参照 |
| `docs/pwa-and-notifications.md` | 本文・図・表の参照、命名注意コールアウトの削除 |
| **(本番)** Supabase Vault `reminder_endpoint_url` | 新 URL に更新(SQL 実行で反映) |
| **(本番)** pg_cron ジョブ | 旧 `daily-reminder` unschedule + 新 `weekly-reminder` schedule |

## 変更してはいけないファイル(再掲)

| ファイル | 理由 |
| --- | --- |
| `database/notification-preferences-weekday.sql` | レガシー JSON キー `daily_reminder` は別物 |
| `src/lib/push/validation.test.ts` | 同上(不明キー拒否のテスト) |
