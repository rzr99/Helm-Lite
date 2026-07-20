-- Enforce the "active" flag at the DATABASE level, so a deactivated user's
-- token is useless even against the raw API (not just the app UI).
--
-- Uses RESTRICTIVE policies: they are AND-ed with the existing permissive
-- policies, so nothing already granted changes — access is only ever
-- narrowed to "...and the caller is active". For any ACTIVE user this is
-- "rule AND true" = the existing rule, so active users are unaffected.
--
-- is_active() is security-definer (bypasses RLS on public.users, no
-- recursion). users.active is NOT NULL default true, so an active user
-- always resolves to true; only a deactivated user is blocked.
-- Idempotent: safe to run more than once.

create or replace function public.is_active()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select active from public.users where id = auth.uid()), false)
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','leads','follow_ups','deals','personas','platforms',
    'accounts','expenses','monthly_finances','training_assets','training_files'
  ]
  loop
    execute format('drop policy if exists "active users only" on public.%I', t);
    execute format(
      'create policy "active users only" on public.%I
         as restrictive to authenticated
         using (public.is_active()) with check (public.is_active())',
      t
    );
  end loop;
end $$;

-- Verification: every active user must compute TRUE (proves no active user
-- is ever locked out). Deactivated users show FALSE (they get blocked).
select full_name, role, active,
       coalesce(active, false) as will_have_access
from public.users
order by role, full_name;
