-- FIX: the filtered dashboard pipeline (by intent / date / agent) counted rows
-- the app fetched from lead_clients, which hit the API's ~1000-row cap — so any
-- filtered set larger than 1000 clients was undercounted (e.g. High intent
-- summing to exactly 1000). The unfiltered view (pipeline_counts) was always
-- correct because it aggregates in Postgres.
--
-- This does the same aggregation in the DB for the filtered case: per-stage
-- counts (agent-scoped), the unique-client count, and a per-agent breakdown
-- (leads, closed, and the shared-with-another-agent count) for the team table.
-- security invoker, so RLS still scopes rows (agent: own; floor: everyone).

create or replace function public.dashboard_pipeline(
  p_intent text default null,
  p_from   date default null,
  p_to     date default null,
  p_agent  uuid default null
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with lc as (
    select agent_id, handle_key, rep_stage
    from public.lead_clients
    where (p_intent is null or rep_intent::text = p_intent)
      and (p_from   is null or first_added >= p_from)
      and (p_to     is null or first_added <= p_to)
  ),
  -- Clients worked by more than one agent across the whole book (all-time),
  -- for the shared / exclusive split on the team table.
  dups as (
    select handle_key
    from public.leads
    group by handle_key
    having count(distinct agent_id) > 1
  ),
  agent_scoped as (
    select * from lc where (p_agent is null or agent_id = p_agent)
  )
  select jsonb_build_object(
    'by_stage', coalesce((
      select jsonb_agg(jsonb_build_object('stage', rep_stage, 'n', n))
      from (
        select rep_stage, count(*)::int as n
        from agent_scoped
        group by rep_stage
      ) s
    ), '[]'::jsonb),
    'unique', (select count(distinct handle_key)::int from agent_scoped),
    'by_agent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'agent_id', agent_id,
        'leads',    leads,
        'closed',   closed,
        'shared',   shared
      ))
      from (
        select
          l.agent_id,
          count(distinct l.handle_key)::int as leads,
          count(distinct l.handle_key) filter (where l.rep_stage = 'closed')::int as closed,
          count(distinct l.handle_key) filter (where d.handle_key is not null)::int as shared
        from lc l
        left join dups d on d.handle_key = l.handle_key
        group by l.agent_id
      ) a
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.dashboard_pipeline(text, date, date, uuid)
  to authenticated;
