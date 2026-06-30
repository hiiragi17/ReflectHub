-- 日次リマインダーを Supabase pg_cron で「JST 11:00 ちょうど」に配信する。
--
-- 背景:
--   従来は Vercel Cron (`vercel.json` の `0 2 * * *`) から
--   /api/cron/daily-reminder を叩いていたが、Vercel Cron は起動時刻が
--   数十分ブレる (例: 11:00 予定が 11:22 起動) ため、ユーザーには
--   "中途半端な時刻に通知が来る" ように見えていた。
--
--   pg_cron は Postgres 内部のバックグラウンドワーカーが毎分スケジュールを
--   評価して実行するため、指定した分ちょうどに起動する。これにより
--   追加コストゼロ (Supabase 無料プランでも pg_cron / pg_net 利用可) で
--   配信時刻の精度を上げる。
--
-- このスクリプトは Supabase SQL Editor で実行する。ベキ等 (再実行可能)。

-- 1) 拡張を有効化
--    pg_cron: スケジューラ / pg_net: DB から外部 HTTP を叩く
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) 秘密情報を Vault に登録する。
--    マイグレーションに平文で書かないため、CRON_SECRET と配信エンドポイント URL は
--    Supabase Vault に保存し、ジョブ実行時に復号して参照する。
--
--    下記 2 つの値は環境に合わせて置き換えてから実行すること:
--      - reminder_endpoint_url: 本番の絶対 URL
--          例) https://reflecthub.app/api/cron/daily-reminder
--      - cron_secret: Vercel に設定している CRON_SECRET と同じ値
--
--    既に同名のシークレットがある場合は値を更新する (ベキ等)。
do $$
declare
  v_url text := 'https://YOUR-DOMAIN/api/cron/daily-reminder'; -- ★要置換
  v_secret text := 'YOUR_CRON_SECRET';                          -- ★要置換
begin
  -- プレースホルダのまま実行すると、認証も到達もできないジョブが静かに登録され
  -- 本番障害につながる。値が未置換なら fail-fast して気付けるようにする。
  if v_url = 'https://YOUR-DOMAIN/api/cron/daily-reminder'
     or v_secret = 'YOUR_CRON_SECRET' then
    raise exception 'daily-reminder-pg-cron.sql: v_url / v_secret を実値に置換してから実行してください';
  end if;
  if v_url !~ '^https://.+' then
    raise exception 'daily-reminder-pg-cron.sql: v_url は絶対 https URL である必要があります (現在: %)', v_url;
  end if;

  if exists (select 1 from vault.secrets where name = 'reminder_endpoint_url') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'reminder_endpoint_url'),
      v_url
    );
  else
    perform vault.create_secret(v_url, 'reminder_endpoint_url');
  end if;

  if exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'cron_secret'),
      v_secret
    );
  else
    perform vault.create_secret(v_secret, 'cron_secret');
  end if;
end $$;

-- 3) 既存の同名ジョブがあれば一旦解除してから登録し直す (ベキ等)。
select cron.unschedule('daily-reminder')
where exists (select 1 from cron.job where jobname = 'daily-reminder');

-- 4) JST 11:00 = 02:00 UTC ちょうどに /api/cron/daily-reminder を叩く。
--    エンドポイントは GET + Authorization: Bearer <CRON_SECRET> を要求するため
--    net.http_get で Authorization ヘッダを付与する。
--    URL / シークレットは Vault から復号して参照する。
--    timeout_milliseconds は pg_net のデフォルト (2000ms) だと、コールドスタートや
--    購読者が多い場合に /api/cron/daily-reminder の処理が 2 秒を超えて DB 側が先に
--    タイムアウトし、配信が中断・誤失敗扱いになる恐れがある。余裕を持って 30 秒にする。
select cron.schedule(
  'daily-reminder',
  '0 2 * * *',
  $job$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_endpoint_url'),
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $job$
);

-- 確認用:
--   登録済みジョブ        : select jobid, jobname, schedule, command from cron.job;
--   直近の実行履歴        : select * from cron.job_run_details order by start_time desc limit 10;
--   pg_net のレスポンス   : select * from net._http_response order by created desc limit 10;
