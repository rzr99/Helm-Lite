-- Expenses reshaped to match the owner's spreadsheet.
-- Applied in two steps (enum values must commit before use).

-- Step 1: sheet section names as categories
alter type public.expense_category add value if not exists 'subscription';
alter type public.expense_category add value if not exists 'utilities';
alter type public.expense_category add value if not exists 'production';
alter type public.expense_category add value if not exists 'salary';
alter type public.expense_category add value if not exists 'extras';
alter type public.expense_category add value if not exists 'others';

-- Step 2: monthly closing figure (owner enters it; balance = closing - spending)
create table if not exists public.monthly_finances (
  month text primary key,
  closing numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.monthly_finances enable row level security;

create policy "owner only"
  on public.monthly_finances for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

-- Map old test data onto the sheet's sections
update public.expenses set category = 'subscription' where category = 'proxy';
