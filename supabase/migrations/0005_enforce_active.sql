-- Enforce the "active" flag at the DATABASE level, so a deactivated user's
-- token is useless even against the raw API (not just the app UI).
--
-- Uses RESTRICTIVE policies: they are AND-ed with the existing permissive
-- policies, so nothing already granted is changed — access is only ever
-- narrowed to "...and the caller is active".
--
-- is_active() is security-definer (bypasses RLS on public.users), so no
-- recursion. Column users.active is NOT NULL default true, so an active
-- user always resolves to true; only a genuinely deactivated user is blocked.

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
    execute format(
      'create policy "active users only" on public.%I
         as restrictive to authenticated
         using (public.is_active()) with check (public.is_active())',
      t
    );
  end loop;
end $$;
