-- Let any signed-in user resolve teammate display names (id + full_name only),
-- without exposing the rest of the users table (role, active, etc.). Used by
-- the "Assigned to me" inbox so an agent can see WHO handed them each lead.
-- security definer bypasses RLS but returns nothing sensitive.
create or replace function public.user_directory()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, full_name from public.users
$$;

grant execute on function public.user_directory() to authenticated;
