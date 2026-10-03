-- 振り返りの二重登録防止（冪等性キー）。Issue #122
-- デプロイ順: この SQL を先に本番へ適用し、そのあとコードをデプロイする。
-- 既存の行は NULL のまま。PostgreSQL の一意制約は NULL を重複とみなさないため、NULL の行は何件あっても問題ない。
-- RLS は列単位ではないため、既存のポリシー（自分の行のみ）がそのまま適用される。
ALTER TABLE public.retrospectives
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS retrospectives_user_idempotency_key_uidx
  ON public.retrospectives (user_id, idempotency_key);
