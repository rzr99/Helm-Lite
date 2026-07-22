-- Monthly sales target (owner sets; everyone signed-in can see progress).
create table if not exists public.monthly_targets (
  month text primary key,
  target numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.monthly_targets enable row level security;

create policy "target readable by signed-in users"
  on public.monthly_targets for select
  using (auth.uid() is not null);

create policy "owner sets target"
  on public.monthly_targets for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

create policy "active users only"
  on public.monthly_targets as restrictive to authenticated
  using (public.is_active()) with check (public.is_active());

-- Which persona/account the agent reached out from (a label, not a dedupe key).
alter table public.leads add column if not exists persona text;

-- Let agents see the personas assigned to them (managed_by), so the lead form
-- can offer them as choices. Owner still sees all; accounts stay owner-only.
create policy "read personas you manage"
  on public.personas for select
  using (managed_by = auth.uid() or public.my_role() = 'owner');
