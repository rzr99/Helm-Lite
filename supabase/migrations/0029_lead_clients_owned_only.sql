-- FIX: assigned-but-unaccepted leads were inflating the RECEIVING agent's own
-- list and counts.
--
-- Migration 0023 (lead assignment) added an RLS policy so an assignee can READ a
-- lead offered to them (needed for the "Assigned to me" inbox, which queries the
-- leads table directly). But `lead_clients` is a security_invoker view, so it
-- returned those assigned rows to the assignee too — grouped under the ORIGINAL
-- owner's agent_id, yet still visible to the assignee. Every count built on
-- lead_clients (pipeline_counts, agent_lead_stats, client_totals, the Leads
-- list, the dashboard) therefore went UP the moment leads were assigned, before
-- the agent accepted anything.
--
-- Fix: lead_clients now only includes clients the viewer OWNS (agent_id = them),
-- while the floor (owner / team_lead) still sees everyone. Assigned-but-unaccepted
-- leads no longer appear here — they live only in the inbox (which reads `leads`
-- directly by assigned_to) until the agent accepts, which flips agent_id to them
-- and only THEN moves the client into their list and counts.
--
-- Only a WHERE clause is added; the column list is byte-for-byte the same as
-- 0027, so `create or replace` is accepted and the dependent views
-- (pipeline_counts, agent_lead_stats, activity_*, client_totals) keep working.
-- Idempotent: safe to re-run.

create or replace view public.lead_clients
with (security_invoker = on) as
select
  agent_id,
  handle_key,
  count(*)::int                                                   as outreach_count,
  min(date_added)                                                 as first_added,
  (array_agg(id             order by date_added desc, created_at desc))[1] as rep_id,
  (array_agg(handle         order by date_added desc, created_at desc))[1] as rep_handle,
  (array_agg(name           order by date_added desc, created_at desc))[1] as rep_name,
  (array_agg(service_interest order by date_added desc, created_at desc))[1] as rep_service,
  (array_agg(source         order by date_added desc, created_at desc))[1] as rep_source,
  (array_agg(stage          order by date_added desc, created_at desc))[1] as rep_stage,
  (array_agg(persona        order by date_added desc, created_at desc))[1] as rep_persona,
  (array_agg(date_added     order by date_added desc, created_at desc))[1] as rep_date_added,
  lower(
    string_agg(coalesce(name,'') || ' ' || handle || ' ' || coalesce(persona,''), ' ')
  )                                                               as search_text,
  jsonb_agg(jsonb_build_object(
    'id', id, 'persona', persona, 'name', name, 'date_added', date_added
  ) order by date_added desc, created_at desc)                    as entries,
  (array_agg(intent         order by date_added desc, created_at desc))[1] as rep_intent
from public.leads
where (
  agent_id = (select auth.uid())
  or (select public.my_role()) in ('owner', 'team_lead')
)
group by agent_id, handle_key;
