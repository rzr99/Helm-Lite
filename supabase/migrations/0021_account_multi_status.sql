-- Accounts can be hit by several states at once (e.g. Ghost banned + DM
-- restricted), so status becomes a LIST. Also add the 'Red label' state.

alter type public.account_status add value if not exists 'red_label';

alter table public.accounts
  add column if not exists statuses public.account_status[] not null default '{}';

-- Carry existing single statuses into the new list.
update public.accounts
  set statuses = array[status]
  where status is not null and cardinality(statuses) = 0;
