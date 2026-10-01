-- Two more cap-proof aggregations (same 1000-row-cap class of bug as 0038).

-- 1) Activity "Leads added" with a lead-type filter was counted by fetching raw
--    lead_clients rows in the app (capped at ~1000). Aggregate in Postgres and
--    return a single jsonb row: per-agent-per-day counts + the unique count.
create or replace function public.activity_leads_added_filtered(
  p_intent text default null,
  p_from   date default null,
  p_to     date default null,
  p_agent  uuid default null
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with scoped as (
    select agent_id, handle_key, first_added
    from public.lead_clients
    where (p_intent is null or rep_intent::text = p_intent)
      and (p_from   is null or first_added >= p_from)
      and (p_to     is null or first_added <= p_to)
      and (p_agent  is null or agent_id = p_agent)
  )
  select jsonb_build_object(
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('agent_id', agent_id, 'day', day, 'n', n))
      from (
        select agent_id, first_added as day, count(*)::int as n
        from scoped
        group by agent_id, first_added
      ) g
    ), '[]'::jsonb),
    'unique', (select count(distinct handle_key)::int from scoped)
  );
$$;

grant execute on function public.activity_leads_added_filtered(text, date, date, uuid)
  to authenticated;

-- 2) The "also worked by another agent" (shared) count per agent was built by
--    fetching every duplicate entry in the app (capped). This view aggregates it
--    in Postgres: one small row per agent. security_invoker, so the floor sees
--    the whole book (agents only their own, where it's always 0 anyway).
create or replace view public.agent_shared_counts
with (security_invoker = on) as
with dups as (
  select handle_key
  from public.leads
  group by handle_key
  having count(distinct agent_id) > 1
)
select l.agent_id, count(distinct l.handle_key)::int as shared
from public.leads l
join dups d on d.handle_key = l.handle_key
group by l.agent_id;

grant select on public.agent_shared_counts to authenticated;
