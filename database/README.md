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
