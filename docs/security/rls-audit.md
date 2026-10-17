# RLS と認可の点検 (2026-10-17)

コードを読んだ範囲の点検結果。**本番の Supabase には接続していない**ため、DB の実際の
設定 (RLS・権限・関数) は未確認で、確認用のクエリを `database/rls-audit.sql` に用意した。

## 結論

- **API ルートの認可は概ね適切。** 認証は `getUser()` で行い、`user_id` はクライアントの値ではなく
  検証済みのセッションから決めている。
- **最も重要な未確認事項は、`retrospectives`(振り返りの本文) などの RLS。** ブラウザから直接アクセス
  されるため、他人のデータを守っているのは RLS だけだが、その定義がリポジトリにない。
- **リダイレクトに実際の穴を 1 つ見つけた (オープンリダイレクト)。** 下の F2。

## 指摘事項

| # | 深刻度 | 内容 | 状態 |
|---|---|---|---|
| F1 | 高 (未確認) | `profiles` / `retrospectives` / `frameworks` / `ai_summaries` の RLS がリポジトリにない | 要確認 |
| F2 | 中 | `next` パラメータの検証が不十分で、外部サイトへリダイレクトされる | 確認済み・未修正 |
| F3 | 中 | `/api/logs/errors` は未認証で書き込めて、レート制限がない | 要検討 |
| F4 | 低 | `/api/auth/session` は CSRF 免除で、Origin の確認がない | 要検討 |
| F5 | 低 | `getSession()` (署名を検証しない) で認可に近い判定をしている箇所がある | 要検討 |
| F6 | 低 | `profiles` を、ユーザーが全列書き換えられる | 要確認 |
| F7 | 情報 | cron の認証が、定数時間比較でない | 任意 |

### F1: コア表の RLS がリポジトリにない (高・未確認)

`push_subscriptions` / `user_preferences` / `error_logs` は、SQL に RLS ポリシーがあり、
`auth.uid() = user_id` で自分の行に限定されている。一方、`profiles` / `retrospectives` /
`frameworks` / `ai_summaries` は、`GRANT` (`data-api-grants.sql`) しかなく、`CREATE TABLE` も
RLS も書かれていない。

`retrospectives` は、`src/services/reflectionService.ts` がブラウザから直接 INSERT / UPDATE /
DELETE / SELECT している。コード内の所有者の確認 (`user_id !== user.id`) はクライアント側で、
攻撃者は公開されている anon キーと自分の JWT で、直接 API を叩けるため、**防御にならない**。
保護の本体は RLS のみ。

**対応:** `database/rls-audit.sql` を Supabase の SQL Editor で実行して、次を確認する。
- 全テーブルで `rls_enabled = true`
- `retrospectives` に、`auth.uid() = user_id` の SELECT / INSERT (`WITH CHECK`) / UPDATE / DELETE がある
- `profiles` は `auth.uid() = id`
- `frameworks` は SELECT のみ (書き込みポリシーがない)
- `ai_summaries` は SELECT で自分の行のみ
- SECURITY DEFINER の関数を、anon が実行できない

あわせて、確認できた定義は、このリポジトリの SQL に取り込んで再現できるようにする。

### F2: オープンリダイレクト (中・確認済み)

ログイン済みのユーザーが `https://<ドメイン>/auth?next=/\evil.com` を開くと、外部サイトに飛ばされる。
`middleware.ts` の検証が `startsWith('/') && !startsWith('//')` だけで、`/\evil.com` を通してしまう。
ブラウザの URL パーサーはバックスラッシュをスラッシュとして扱うため、`https://evil.com/` になる
(`new URL('/\\evil.com', base)` で確認済み)。

同じ未検証の `next` が、次の 2 か所にもある。
- `src/app/auth/callback/page.tsx`(`router.push(next)`)
- `src/app/auth/page.tsx`(`router.push(next)`)

フィッシングに使われる。実害は、ログイン済みのユーザーがリンクを踏む必要がある点で限定的。

**対応案:** `next` を検証する共通関数を作り (`/` で始まり、`//` と `/\` で始まらず、
パース後のオリジンが自サイトと同じ)、3 か所で使う。小さな修正。

### F3: エラーログの未認証書き込み (中)

`/api/logs/errors` の POST は、ログイン前のクラッシュを記録するため、未認証で受け付け、CSRF も
免除している (設計どおり)。ただしレート制限がなく、1 リクエストで最大 50 件 (`stack` が各 20KB)、
`metadata` は大きさ無制限のため、DB の容量を使い切られる可能性がある。
RLS が `user_id IS NULL` に限定しているため、他人の名義で書くことはできない。

**対応案:** IP ごとのレート制限、`metadata` の大きさの上限、保存期間の設定。

### F4: `/api/auth/session` の Origin 確認 (低・理論上)

CSRF 免除のため、他サイトから POST できる。攻撃者の持つトークンで被害者をログインさせる
(ログイン CSRF) 攻撃が考えられるが、現状は `.strict()` のスキーマと、JSON としての厳密な
パースで、実質的に成立しない。ただし意図した防御ではないため、`Origin` / `Sec-Fetch-Site` を
確認するとよい。

### F5: `getSession()` の利用 (低)

`/api/logs/errors`(POST・GET) と `/api/auth/verify` は、署名を検証しない `getSession()` を使っている。
`/api/logs/errors` の POST のコメントは「server-verified」とあるが、実際は検証されていない。
偽造した Cookie では、PostgREST が JWT を検証して弾くため、データの漏えいにはならないが、
`getUser()` に揃える方が安全で、コメントとも一致する。

### F6: `profiles` の全列更新 (低・要確認)

`authenticated` に `UPDATE` が全列で付いている。`profiles` に、権限や課金を表す列
(`role` / `is_admin` / `plan` など) があれば、ユーザーが自分で書き換えられる。コード上は、
`name` / `email` / `provider` / `avatar_url` などで、そのような列は見当たらない
(DB の実際の列は `rls-audit.sql` の 5 で確認する)。

### F7: cron の認証 (情報)

`/api/cron/weekly-reminder` は、`Authorization` ヘッダを `!==` で比較している。実害は小さいが、
定数時間比較にできる。

## 問題がなかった点

- `/api/preferences` / `/api/push/*` / `/api/analytics/*` / `/api/auth/profile/[userId]` は、
  `getUser()` で認証し、`user_id` を検証済みのセッションから決めている。
  プロフィールは、さらに `user.id !== userId` で 403 にしている。
- service role のキーは、`reminderService.ts`(cron 専用) のみで使われ、ブラウザには出ていない。
- 状態を変える API は、CSRF トークン (Double Submit Cookie + HMAC) で保護されている。
- `handle_new_user_simple()` は、`SECURITY DEFINER` で `search_path` を固定している。
- pg_cron の SQL は、秘密情報を Vault に置き、平文でマイグレーションに書いていない。

## 次の手順

1. `database/rls-audit.sql` を本番で実行し、結果を確認する (F1・F6)。
2. F2 を修正する (小さな修正)。
3. F3〜F5 を、必要に応じてイシュー化する。
