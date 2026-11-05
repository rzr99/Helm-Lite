-- Expenses can be paid in USDT as well as rupees. USDT items are tracked in
-- their own total and are NOT mixed into the Rs totals, net profit or bank
-- balance (they're paid from a crypto wallet, not the bank).
alter table public.expenses
  add column if not exists currency text not null default 'PKR';

alter table public.expenses
  drop constraint if exists expenses_currency_check;
alter table public.expenses
  add constraint expenses_currency_check check (currency in ('PKR', 'USDT'));
