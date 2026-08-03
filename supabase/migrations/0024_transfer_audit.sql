-- Audit log for lead transfers, so every handoff is one-click reversible.
--
-- Each transfer (owner assigning, or an agent accepting) writes one BATCH row
-- plus one ITEM row per lead capturing that lead's PREVIOUS owner/assignment.
-- Reverting a batch restores every item to its prev state. Nothing is ever
-- silently lost again.

create table if not exists public.lead_transfer_batches (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users (id),
  kind text not null,                        -- 'assign' | 'accept'
  from_agent_id uuid references public.users (id),
  to_agent_id uuid references public.users (id),
  lead_count int not null default 0,
  created_at timestamptz not null default now(),
  reverted_at timestamptz,
  reverted_by uuid references public.users (id)
);

create table if not exists public.lead_transfer_items (
  batch_id uuid not null references public.lead_transfer_batches (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  prev_agent_id uuid,
  prev_assigned_to uuid,
  primary key (batch_id, lead_id)
);

create index if not exists idx_ltb_created
  on public.lead_transfer_batches (created_at desc);

alter table public.lead_transfer_batches enable row level security;
alter table public.lead_transfer_items enable row level security;

-- Anyone active logs their own action; the owner reads everything and reverts.
drop policy if exists "transfer log: actor inserts" on public.lead_transfer_batches;
create policy "transfer log: actor inserts" on public.lead_transfer_batches
  for insert to authenticated
  with check (actor_id = (select auth.uid()));

drop policy if exists "transfer log: reads" on public.lead_transfer_batches;
create policy "transfer log: reads" on public.lead_transfer_batches
  for select to authenticated
  using (public.my_role() = 'owner' or actor_id = (select auth.uid()));

drop policy if exists "transfer log: owner reverts" on public.lead_transfer_batches;
create policy "transfer log: owner reverts" on public.lead_transfer_batches
  for update to authenticated
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

drop policy if exists "transfer items: insert" on public.lead_transfer_items;
create policy "transfer items: insert" on public.lead_transfer_items
  for insert to authenticated with check (true);

drop policy if exists "transfer items: owner reads" on public.lead_transfer_items;
create policy "transfer items: owner reads" on public.lead_transfer_items
  for select to authenticated using (public.my_role() = 'owner');

grant select, insert, update on public.lead_transfer_batches to authenticated;
grant select, insert on public.lead_transfer_items to authenticated;
