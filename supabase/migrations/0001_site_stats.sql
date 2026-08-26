-- Live visitor stats for the footer badge.
--
-- Run this once in the Supabase dashboard (SQL Editor -> New query -> Run) or
-- via `supabase db push` if you use the CLI. Everything here is reachable with
-- the public anon key only through the narrow surface defined below: read the
-- single counter row, and call bump_visits() to add one.

create table if not exists public.site_stats (
  id text primary key,
  visits bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_stats (id, visits)
values ('total', 0)
on conflict (id) do nothing;

alter table public.site_stats enable row level security;

-- Anyone may read the counter; nobody may write it directly (no insert/update/
-- delete policy exists, so those are denied for anon and authenticated alike).
drop policy if exists "site_stats is publicly readable" on public.site_stats;
create policy "site_stats is publicly readable"
  on public.site_stats
  for select
  using (true);

-- The only write path. security definer lets it bypass RLS, and the pinned
-- search_path keeps a hostile schema from shadowing site_stats.
create or replace function public.bump_visits()
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.site_stats
     set visits = visits + 1,
         updated_at = now()
   where id = 'total'
  returning visits;
$$;

revoke all on function public.bump_visits() from public;
grant execute on function public.bump_visits() to anon, authenticated;

-- Publish row changes so tabs already open see the total tick up without a
-- reload. Wrapped because re-adding an already-published table raises.
do $$
begin
  alter publication supabase_realtime add table public.site_stats;
exception
  when duplicate_object then null;
end $$;
