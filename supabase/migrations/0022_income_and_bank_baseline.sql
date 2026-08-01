-- Money received (incremental payouts) + a single editable bank-balance baseline.
-- Shifts the expenses sheet off the one-figure monthly "closing" model: income
-- now arrives as many receipts, and the bank balance is derived live as
-- (baseline + all income - all expenses), so it moves the moment anything is
-- logged and can be re-set to a real figure at any time.
--
-- (An earlier `monthly_finances.adjustment` column was added by hand for a prior
--  iteration; it is now unused and left in place, harmless.)

-- 1) Income: one row per payment received.
create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  source text not null default '',
  amount numeric(14, 2) not null,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists income_date_idx on public.income (date);

alter table public.income enable row level security;

drop policy if exists "owner only" on public.income;
create policy "owner only"
  on public.income for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

drop policy if exists "active users only" on public.income;
create policy "active users only" on public.income
  as restrictive to authenticated
  using (public.is_active()) with check (public.is_active());

-- 2) A single-row settings table holding the editable bank-balance baseline.
create table if not exists public.finance_settings (
  id boolean primary key default true,
  bank_baseline numeric(14, 2) not null default 0,
  constraint finance_settings_singleton check (id),
  created_at timestamptz not null default now()
);

alter table public.finance_settings enable row level security;

drop policy if exists "owner only" on public.finance_settings;
create policy "owner only"
  on public.finance_settings for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

drop policy if exists "active users only" on public.finance_settings;
create policy "active users only" on public.finance_settings
  as restrictive to authenticated
  using (public.is_active()) with check (public.is_active());

insert into public.finance_settings (id) values (true)
  on conflict (id) do nothing;
