-- Rate limit for the public visit counter.
--
-- 0001 granted execute on bump_visits() to anon, and the anon key ships inside
-- the client bundle, so the RPC was a loop away from being meaningless: a shell
-- one-liner could drive the counter anywhere and burn the project's request
-- quota doing it. This migration replaces the function with a budgeted version
-- and adds the private bookkeeping table it needs.
--
-- Run this in the Supabase dashboard (SQL Editor -> New query -> Run) or via
-- `supabase db push`. Safe to re-run.

-- Per-address daily budget. The key is md5(ip || UTC date), so no raw address is
-- ever stored and yesterday's keys cannot be linked to today's.
create table if not exists public.visit_buckets (
  bucket text primary key,
  hits int not null default 0,
  seen_at timestamptz not null default now()
);

-- No policies are defined and none should be: RLS with an empty policy set denies
-- everything, and bump_visits() reaches the table as security definer instead.
-- The explicit revoke covers the grants Supabase hands to the API roles by
-- default, so the table never appears in the REST schema at all.
alter table public.visit_buckets enable row level security;
revoke all on table public.visit_buckets from anon, authenticated;

-- How many visits one address may contribute per UTC day. Deliberately well
-- above 1: carrier NAT, offices, and university networks put many real readers
-- behind a single address, and a cap of 1 would erase almost all of them. Still
-- low enough that a scripted loop cannot move the number.
create or replace function public.visit_daily_cap()
returns int
language sql
immutable
as $$ select 20 $$;

create or replace function public.bump_visits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  forwarded text;
  client_ip text;
  bucket_key text;
  used int;
  total bigint;
begin
  -- PostgREST exposes the request headers as a transaction-local setting.
  -- x-forwarded-for is a client-then-proxies list, so the caller is the first
  -- entry.
  forwarded := current_setting('request.headers', true)::json->>'x-forwarded-for';
  client_ip := nullif(btrim(split_part(coalesce(forwarded, ''), ',', 1)), '');

  -- No forwarded address means there is nothing to budget against, so the visit
  -- is counted. Supabase's edge sets this header, so a hostile client cannot
  -- strip it to reach this branch — its absence is a platform quirk, not an
  -- attack.
  if client_ip is not null then
    bucket_key := md5(client_ip || current_date::text);

    insert into public.visit_buckets as b (bucket, hits)
    values (bucket_key, 1)
    on conflict (bucket) do update
      set hits = b.hits + 1,
          seen_at = now()
    returning b.hits into used;

    -- First sighting of this address today is the cheapest moment to take out
    -- the trash: at most one delete per address per day, and it keeps the table
    -- bounded without depending on pg_cron.
    if used = 1 then
      delete from public.visit_buckets where seen_at < current_date - 1;
    end if;

    if used > public.visit_daily_cap() then
      -- Over budget. Hand back the current total without touching it, which also
      -- means no realtime UPDATE fires for the tabs listening on site_stats.
      select visits into total from public.site_stats where id = 'total';
      return total;
    end if;
  end if;

  update public.site_stats
     set visits = visits + 1,
         updated_at = now()
   where id = 'total'
  returning visits into total;

  return total;
end;
$$;

revoke all on function public.bump_visits() from public;
grant execute on function public.bump_visits() to anon, authenticated;
