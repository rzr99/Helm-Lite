-- ============================================================
-- UNIQUE CLIENTS — show distinct people, not just client-entries.
-- lead_clients has one row per (agent, handle): if 4 agents each work
-- the same 20 clients that's 80 rows but only 20 *distinct* handles.
-- These add the "distinct handle" count next to the existing totals.
-- All security_invoker / invoker, so RLS still scopes what each user sees
-- (an agent's unique == their own total; only the floor sees overlap).
-- ============================================================

-- Dashboard: whole-floor (or own) totals — logged vs unique.
create or replace view public.client_totals
with (security_invoker = on) as
select
  count(*)::int                 as total_clients,   -- distinct (agent, handle)
  count(distinct handle_key)::int as unique_clients  -- distinct handle company-wide
from public.lead_clients;

-- Leads list: unique count for the CURRENT filters (mirrors the page's
-- stage / agent / date / search filters so the two numbers stay in step).
create or replace function public.lead_unique_count(
  p_stage  text default null,
  p_agent  uuid default null,
  p_from   date default null,
  p_to     date default null,
  p_search text default null
) returns int
language sql stable security invoker
set search_path = public
as $$
  select count(distinct handle_key)::int
  from public.lead_clients
  where (p_stage is null or rep_stage::text = p_stage)
    and (p_agent is null or agent_id = p_agent)
    and (p_from  is null or rep_date_added >= p_from)
    and (p_to    is null or rep_date_added <= p_to)
    and (p_search is null or trim(p_search) = '' or
         search_text like all(
           array(
             select '%' || tok || '%'
             from unnest(string_to_array(lower(trim(p_search)), ' ')) tok
             where tok <> ''
           )
         ));
$$;

-- Activity: distinct clients added within the date range (and optional agent).
create or replace function public.activity_unique_added(
  p_from  date,
  p_to    date,
  p_agent uuid default null
) returns int
language sql stable security invoker
set search_path = public
as $$
  select count(distinct handle_key)::int
  from public.lead_clients
  where first_added between p_from and p_to
    and (p_agent is null or agent_id = p_agent);
$$;

grant select on public.client_totals to authenticated;
grant execute on function public.lead_unique_count(text, uuid, date, date, text) to authenticated;
grant execute on function public.activity_unique_added(date, date, uuid) to authenticated;
