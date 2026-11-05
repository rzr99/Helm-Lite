-- Audit log for the owner's "merge into one sale" tool. Old sales were logged
-- once per instalment, so one real sale shows up as several deals. A merge
-- moves every payment onto the kept deal and removes the extra rows; this log
-- keeps a full copy of what was removed so any merge can be undone.
create table if not exists public.deal_merges (
  id uuid primary key default gen_random_uuid(),
  kept_deal_id uuid not null,
  -- Full rows of the deals that were removed (as they were before the merge).
  removed_deals jsonb not null,
  -- [{id, deal_id}] — payments moved onto the kept deal, with their old deal.
  moved_payments jsonb not null default '[]'::jsonb,
  -- [{id, deal_id}] — production jobs re-pointed to the kept deal.
  moved_jobs jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

alter table public.deal_merges enable row level security;

drop policy if exists "owner only" on public.deal_merges;
create policy "owner only"
  on public.deal_merges for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

drop policy if exists "active users only" on public.deal_merges;
create policy "active users only" on public.deal_merges
  as restrictive to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));

grant select, insert, update on public.deal_merges to authenticated;
