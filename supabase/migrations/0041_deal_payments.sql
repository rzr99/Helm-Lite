-- One sale = one deal. Each payment the client makes is a row in
-- deal_payments, so a $1,000 sale paid $300 + $200 + $500 stays ONE deal
-- (sale count + average deal size stay right) while the cash is credited to the
-- month each payment actually landed (targets / commission follow the money).
--
-- deals.revenue_received is kept as the running sum of the deal's payments
-- (trigger below), so everything that reads it keeps working; deals.balance is
-- what's still owed.

create table if not exists public.deal_payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  -- Copied from the deal by trigger so per-agent monthly totals are a plain
  -- filter. Deliberately NO foreign key to users: a second FK path between
  -- deals and users would make the existing `agent:users(...)` embeds ambiguous.
  agent_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null default public.karachi_today(),
  payment_method text,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists deal_payments_deal_idx on public.deal_payments (deal_id);
create index if not exists deal_payments_paid_on_idx on public.deal_payments (paid_on);
create index if not exists deal_payments_agent_paid_idx on public.deal_payments (agent_id, paid_on);

-- What's still owed on each sale.
alter table public.deals
  add column if not exists balance numeric(12, 2)
  generated always as (deal_size - revenue_received) stored;

-- ---- Backfill: every existing deal's received amount becomes one payment,
-- dated the day the deal closed (that's how it was being counted until now).
insert into public.deal_payments (deal_id, agent_id, amount, paid_on, payment_method, note)
select d.id, d.agent_id, d.revenue_received, d.date_closed, d.payment_method,
       'Carried over from the old sales form'
from public.deals d
where d.revenue_received > 0
  and not exists (select 1 from public.deal_payments p where p.deal_id = d.id);

-- ---- Payment rows always carry their deal's agent.
create or replace function public.deal_payments_set_agent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select agent_id into new.agent_id from public.deals where id = new.deal_id;
  if new.agent_id is null then
    raise exception 'Sale not found';
  end if;
  return new;
end;
$$;

drop trigger if exists deal_payments_set_agent on public.deal_payments;
create trigger deal_payments_set_agent
  before insert or update of deal_id on public.deal_payments
  for each row execute function public.deal_payments_set_agent();

-- ---- Keep deals.revenue_received = sum of its payments.
create or replace function public.deal_payments_sync_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ids uuid[];
begin
  if tg_op = 'DELETE' then
    ids := array[old.deal_id];
  elsif tg_op = 'UPDATE' then
    ids := array[old.deal_id, new.deal_id];
  else
    ids := array[new.deal_id];
  end if;

  update public.deals d
  set revenue_received = coalesce(
    (select sum(p.amount) from public.deal_payments p where p.deal_id = d.id), 0)
  where d.id = any(ids);

  return null;
end;
$$;

drop trigger if exists deal_payments_sync_received on public.deal_payments;
create trigger deal_payments_sync_received
  after insert or update or delete on public.deal_payments
  for each row execute function public.deal_payments_sync_received();

-- If a sale is moved to another agent, its payments follow.
create or replace function public.deals_sync_payment_agent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.deal_payments set agent_id = new.agent_id where deal_id = new.id;
  return null;
end;
$$;

drop trigger if exists deals_sync_payment_agent on public.deals;
create trigger deals_sync_payment_agent
  after update of agent_id on public.deals
  for each row when (old.agent_id is distinct from new.agent_id)
  execute function public.deals_sync_payment_agent();

-- ---- RLS: same rules as deals (agent: own; floor reads all; owner edits all;
-- team lead is read-only on others).
alter table public.deal_payments enable row level security;

drop policy if exists "agent reads own payments; floor reads all" on public.deal_payments;
create policy "agent reads own payments; floor reads all"
  on public.deal_payments for select
  using (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner', 'team_lead'));

drop policy if exists "agent adds own payments; owner any" on public.deal_payments;
create policy "agent adds own payments; owner any"
  on public.deal_payments for insert
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent edits own payments; owner any" on public.deal_payments;
create policy "agent edits own payments; owner any"
  on public.deal_payments for update
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent removes own payments; owner any" on public.deal_payments;
create policy "agent removes own payments; owner any"
  on public.deal_payments for delete
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "active users only" on public.deal_payments;
create policy "active users only" on public.deal_payments
  as restrictive to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));

grant select, insert, update, delete on public.deal_payments to authenticated;

-- ---- Sales totals: sales count / value / average by CLOSE date; cash received
-- by PAYMENT date; outstanding = everything still owed (any month).
create or replace function public.deal_summary(
  p_service  text default null,
  p_category text default null,
  p_agent    uuid default null,
  p_from     date default null,
  p_to       date default null
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with matching as (
    select * from public.deals d
    where (p_service  is null or d.service          = p_service)
      and (p_category is null or d.service_category = p_category)
      and (p_agent    is null or d.agent_id         = p_agent)
  ),
  closed as (
    select * from matching
    where (p_from is null or date_closed >= p_from)
      and (p_to   is null or date_closed <= p_to)
  ),
  paid as (
    select p.amount, coalesce(m.service_category, 'Uncategorized') as name
    from public.deal_payments p
    join matching m on m.id = p.deal_id
    where (p_from is null or p.paid_on >= p_from)
      and (p_to   is null or p.paid_on <= p_to)
  ),
  cats as (
    select name, sum(revenue) as revenue, sum(cnt) as cnt
    from (
      select name, amount as revenue, 0 as cnt from paid
      union all
      select coalesce(service_category, 'Uncategorized'), 0, 1 from closed
    ) u
    group by name
  )
  select jsonb_build_object(
    'total_received',    (select coalesce(sum(amount), 0) from paid),
    'payment_count',     (select count(*) from paid),
    'total_size',        (select coalesce(sum(deal_size), 0) from closed),
    'deal_count',        (select count(*) from closed),
    'outstanding',       (select coalesce(sum(balance), 0) from matching where balance > 0),
    'outstanding_count', (select count(*) from matching where balance > 0),
    'by_category', coalesce((
      select jsonb_agg(
               jsonb_build_object('name', name, 'revenue', revenue, 'count', cnt)
               order by revenue desc)
      from cats
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.deal_summary(text, text, uuid, date, date) to authenticated;
