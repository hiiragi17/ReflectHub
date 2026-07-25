# データベースマイグレーション

## Data API 公開ポリシー（必読）

2026-05-30 以降の新規 Supabase プロジェクトでは、`public` スキーマのテーブルは
PostgREST / GraphQL / supabase-js から**自動公開されなくなる**。
ReflectHub のような既存プロジェクトも 2026-10-30 までに同じ挙動になる予定。

**新しいテーブルを作る migration を追加するときは、必ず明示的な `GRANT` を併記すること。**
RLS ポリシーがあってもロールにベース権限が無ければ到達できない。

書き方の例:

```sql
-- ブラウザクライアントから直接 CRUD するテーブル
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;

-- 書き込みを RPC 経由に閉じたいテーブル
GRANT SELECT ON public.<table> TO authenticated;

-- 未認証ユーザーからも書き込みを受け付けるテーブル（例: error_logs）
GRANT INSERT ON public.<table> TO anon;
```

既存テーブルへ一括で同等の権限を付与したい場合は
[`data-api-grants.sql`](./data-api-grants.sql) を流す（ベキ等）。

参考: https://github.com/orgs/supabase/discussions/45329

---

## Phase 3: Web Push 重複通知防止 (idempotency)

`add-last-notified-at.sql` を Supabase SQL Editor で実行する。

- `user_preferences.last_notified_at TIMESTAMPTZ` を追加
- 同日中の重複通知を防ぐため、cron 実行時に参照・更新する
- 既存データには影響しない (NULL = 未通知扱い)

実行後、Vercel に以下の環境変数を設定する:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (任意。デフォルト `mailto:noreply@reflecthub.app`)

VAPID キーペアは `pnpm exec web-push generate-vapid-keys` で生成する
(まだ依存追加前なら `pnpm dlx web-push generate-vapid-keys`)。

---

## Phase 4: 配信時刻の精度向上 (Vercel Cron → pg_cron)

`weekly-reminder-pg-cron.sql` を Supabase SQL Editor で実行する。

### 背景

Vercel Cron は起動時刻が数十分ブレる (11:00 予定が 11:22 起動など) ため、
ユーザーには「中途半端な時刻に通知が来る」ように見えていた。
Supabase の `pg_cron` は分ちょうどに起動するため、**追加コストゼロ**
(無料プランでも `pg_cron` / `pg_net` 利用可) で配信時刻を JST 11:00 に揃える。

### 実行手順

1. `weekly-reminder-pg-cron.sql` を開き、以下 2 箇所を環境に合わせて置換する:
   - `reminder_endpoint_url`: 本番の絶対 URL
     (例 `https://reflecthub.app/api/cron/weekly-reminder`)
   - `cron_secret`: Vercel に設定している `CRON_SECRET` と同じ値
2. Supabase SQL Editor に貼り付けて実行する (ベキ等・再実行可)。
3. `select * from cron.job;` でジョブ `weekly-reminder` が登録されたことを確認。
4. 動作確認は `select * from cron.job_run_details order by start_time desc limit 10;`
   と `select * from net._http_response order by created desc limit 10;` で行う。

### 注意

- このスクリプトの実行と同時に、`vercel.json` から Vercel Cron 定義を削除済み。
  **二重スケジュールにはならない** (なお重複送信は `last_notified_at` でも防止される)。
- `CRON_SECRET` をローテーションした場合は、本スクリプトの `cron_secret` を
  更新して再実行すること (Vault の値が更新される)。

---

## Phase 5: 配信時刻のユーザー設定対応 (reminder_hour)

以下 2 つを Supabase SQL Editor で実行する (どちらもベキ等・再実行可)。

1. `notification-preferences-hour.sql`
   - `notification_preferences` のデフォルトに `reminder_hour: 11` を追加
   - `reminder_hour` キーを持たない既存行へ 11 (従来の固定時刻 JST 11:00) を補完
   - 設定済みユーザーの値は上書きしない
2. `weekly-reminder-pg-cron.sql` (更新版)
   - リマインダージョブのスケジュールを `0 2 * * *` (JST 11:00 の 1 日 1 回)
     から `0 * * * *` (毎時 0 分) に変更
   - どのユーザーに配信するかは、アプリ側 (`src/services/reminderService.ts`) が
     ユーザー設定の曜日 (`reminder_weekday`)・時刻 (`reminder_hour`、JST) と
     「JST での今の曜日・時」を突き合わせて判定する

### 注意

- **実行順序**: 先に `notification-preferences-hour.sql` を流してから
  pg_cron のスケジュールを更新すること。
- **`reminder_hour` は全行が持つ前提**: アプリ側は「キー無し = 11 時扱い」の
  フォールバックを持たない (Phase 7 で削除済み)。`notification-preferences-hour.sql`
  を流していない環境ではリマインダーが配信されないため、実行後に下記が 0 件で
  あることを必ず確認する:
  ```sql
  select count(*) from public.user_preferences
  where not (notification_preferences ? 'reminder_hour');
  ```
- 毎時起動になるが、設定時刻に一致しないユーザーがいない時間帯は
  対象 0 件で即終了するため、追加コストは無視できる。
- 同日中の重複配信は従来どおり `last_notified_at` で防止される。

---

## Phase 6: リマインダーの命名を実態に合わせる (daily → weekly)

リマインダーは元から「ユーザーが選んだ曜日・時刻に週 1 回」の週次仕様だが、
エンドポイント名・pg_cron ジョブ名・SQL ファイル名が `daily-reminder` のままで
実態とズレていたため、`weekly-reminder` に統一した。

| 対象 | 旧 | 新 |
| --- | --- | --- |
| エンドポイント | `/api/cron/daily-reminder` | `/api/cron/weekly-reminder` |
| pg_cron ジョブ名 | `daily-reminder` | `weekly-reminder` |
| SQL ファイル | `daily-reminder-pg-cron.sql` | `weekly-reminder-pg-cron.sql` |

### 反映手順

1. コードをデプロイして新エンドポイント `/api/cron/weekly-reminder` を有効にする。
2. `weekly-reminder-pg-cron.sql` の `v_url` **と** `v_secret` を実値に置換して
   Supabase SQL Editor で実行する。
   - `v_url`: 新パスの絶対 URL (例 `https://reflecthub.app/api/cron/weekly-reminder`)
   - `v_secret`: Vercel に設定している `CRON_SECRET` と同じ値。
     **Vault に `cron_secret` が既にある場合でも置換は必須** — スクリプトは
     プレースホルダのままだと fail-fast で例外を投げて全体が中断し、Vault の
     URL 更新もジョブの入れ替えも行われない (旧 URL を叩き続けて 404 になる)。
   実行すると Vault の `reminder_endpoint_url` が新 URL に更新され、旧ジョブ
   `daily-reminder` が解除されて新ジョブ `weekly-reminder` が登録される。
3. 確認:
   - `select jobid, jobname, schedule, command from cron.job;`
     → `weekly-reminder` があり `daily-reminder` が無いこと
   - `select decrypted_secret from vault.decrypted_secrets where name = 'reminder_endpoint_url';`
     → 新 URL であること
   - 次の毎時 0 分の後、
     `select * from cron.job_run_details order by start_time desc limit 5;` が成功していること

### 注意

- **手順 1 と 2 の間は、pg_cron が旧 URL を叩くため 404 になる。** この間に毎時 0 分を
  またぐと、その時刻に配信予定だったユーザーはその週のリマインダーを取りこぼす
  (`last_notified_at` は重複配信を防ぐだけで、取りこぼしは救済しない。週次配信
  なので次の機会は 1 週間後)。対応は次のどちらかを選ぶ:
  - **案 A (推奨・シンプル)**: 配信対象がいない時間帯に手順 1〜2 をまとめて実施する。
    毎時起動なので空振りの 404 が 1 回発生するだけで、その 1 時間に対象ユーザーが
    居なければ影響ゼロ。事前に対象の有無を確認する場合:
    ```sql
    -- JST の「次の毎時 0 分」に配信対象がいるか (0 なら安全に切り替えられる)
    -- reminder_weekday が null (通知 OFF) の行は ->> が NULL を返すため自然に除外される。
    -- reminder_hour 未設定の既存行はアプリと同じくデフォルト 11 時として扱う。
    with next_tick as (
      select date_trunc('hour', (now() at time zone 'Asia/Tokyo') + interval '1 hour') as t
    )
    select count(*) from public.user_preferences, next_tick
    where notification_preferences->>'reminder_weekday' = extract(dow from t)::text
      and coalesce(notification_preferences->>'reminder_hour', '11') = extract(hour from t)::text;
    ```
  - **案 B (無停止)**: 旧パス `/api/cron/daily-reminder` に新ハンドラを再エクスポート
    する互換ルートを一時的に用意してからデプロイし、手順 2〜3 の稼働確認まで終えた
    のちに互換ルートを削除する 2 段階デプロイ。空白はゼロになるが follow-up PR が要る。
- `notification_preferences` の**アンダースコア**キー `daily_reminder` は
  旧データモデルのレガシーキーで、今回のリネームとは無関係
  (`notification-preferences-weekday.sql` の migration がそのまま残っている)。

---

## Phase 7: `reminder_hour` のキー無しフォールバックを削除

`notification-preferences-hour.sql` がカラムのデフォルトと既存行の補完を
済ませているため、`notification_preferences` に `reminder_hour` を持たない行は
存在しない。アプリ側に残っていた「キー無し = JST 11:00 扱い」の防御的な
フォールバックを削除し、`reminder_hour` を必須として扱うようにした。

- 配信対象の抽出クエリが `reminder_hour` の一致だけを見る単純な条件になった
  (以前はキー無し行を拾うため `is.null` の行も毎時取得していた)
- 型 (`NotificationPreferences.reminder_hour`) が optional から必須になった

### 前提条件

**`notification-preferences-hour.sql` を実行済みであること。** 未実行の環境では
`reminder_hour` を持たない行がクエリに一致せず、リマインダーが配信されなくなる。
下記が 0 件であることを確認する:

```sql
select count(*) from public.user_preferences
where not (notification_preferences ? 'reminder_hour');
```

0 件でない場合は `notification-preferences-hour.sql` を流してから再確認する
(ベキ等・再実行可、設定済みユーザーの値は上書きしない)。

---

## Google ログインの名前が 'Test User' になる問題の修正 (Issue #56 再発)

`fix-google-login-username.sql` を Supabase SQL Editor で実行する (ベキ等・再実行可)。

### 背景

`auth.users` の AFTER INSERT トリガー `on_auth_user_created` が実行する
`handle_new_user_simple()` (ダッシュボードで直接作成されており、リポジトリ管理外
だった) が、`profiles.name` に `'Test User'` をハードコードしていた。
アプリ側のログイン時上書き (`/api/auth/session`) は OAuth コールバックの経路に
よってはスキップされるため、新規登録ユーザーが 'Test User' のまま残っていた。

### 実行内容

1. `handle_new_user_simple()` を、Google の `raw_user_meta_data`
   (full_name → name → メールの @ 前 → 'ユーザー') から名前を取得する実装に置き換え
2. 既存の `name = 'Test User'` の行を同じ優先順位で一括修復
   (ユーザーが手動で変更した名前には触れない)

### 動作確認

```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user_simple';
SELECT count(*) FROM public.profiles WHERE name = 'Test User';  -- 0 になるはず
```

---


## Phase 2: フレームワーク拡張（2個 → 7個）

### 実行手順（2段階）

#### Step 1: フレームワークをDBに追加（is_active = false で追加）

1. **Supabase コンソールにアクセス**
   - https://supabase.com にログイン
   - ReflectHub プロジェクトを選択

2. **SQL Editor を開く**
   - 左サイドバーから「SQL Editor」をクリック
   - 「New query」をクリック

3. **`add-frameworks-phase2.sql` を実行**
   - `add-frameworks-phase2.sql` の内容をコピー
   - SQL Editor に貼り付け
   - 「Run」ボタンをクリック

4. **結果を確認**
   - 7個のフレームワークが追加されたことを確認
   - 新規追加の5個は `is_active = false` になっていることを確認
   - エラーがないことを確認

**注意**: この段階では既存ユーザーには影響しません（YWT/KPTのみ表示されます）

#### Step 2: UI実装完了後にフレームワークを有効化

1. **カードグリッドUI + 動的フォームの実装が完了したら**

2. **`activate-frameworks.sql` を実行**
   - `activate-frameworks.sql` の内容をコピー
   - SQL Editor に貼り付け
   - 「Run」ボタンをクリック

3. **結果を確認**
   - アクティブなフレームワークが7個になったことを確認

### 追加されるフレームワーク一覧

#### 既存（2個）
- YWT（やったこと・わかったこと・次にやること）
- KPT（Keep・Problem・Try）

#### 追加（5個）
1. **DAKI** - Drop・Add・Keep・Improve（プロセス改善）
2. **STAR** - Situation・Task・Action・Result（キャリア面接向け）
3. **WLT** - Win・Learn・Try（成功体験重視）
4. **4L** - Liked・Learned・Lacked・Longed for（学習向け）
5. **振り返り日記** - 時系列日記形式

### ロールバック（削除）

もし追加したフレームワークを削除したい場合：

```sql
-- 追加した5個のフレームワークを削除
DELETE FROM frameworks
WHERE id IN ('daki', 'star', 'wlt', '4l', 'diary');
```

### 注意事項

- `ON CONFLICT (id) DO NOTHING` により、既存のYWT/KPTには影響しません
- 既存ユーザーのデータには影響しません
- Step 1 (`add-frameworks-phase2.sql`) のみ、フロントエンドUI更新前に実行しても問題ありません
- Step 2 (`activate-frameworks.sql`) はUI実装完了後に実行してください（先行実行すると未実装のフレームワークがユーザーに表示されます）
