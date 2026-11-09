-- A sale with money left can be closed:
--   'lost'    — the client won't pay the rest (project stopped etc.). The amount
--               left at that moment is kept in lost_amount for the Payment lost list.
--   'settled' — nothing is really owed (an old sale that was logged twice, once
--               per instalment). Clears the false balance; nothing counted as lost.
-- 'open' is the normal state. Reopening sets it back to 'open'.
alter table public.deals
  add column if not exists pay_status text not null default 'open',
  add column if not exists lost_amount numeric(12, 2) not null default 0,
  add column if not exists closed_on date,
  add column if not exists close_note text;

alter table public.deals drop constraint if exists deals_pay_status_check;
alter table public.deals
  add constraint deals_pay_status_check check (pay_status in ('open', 'lost', 'settled'));

create index if not exists deals_open_balance_idx
  on public.deals (pay_status, balance) where pay_status = 'open';
