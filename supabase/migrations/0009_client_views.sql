-- ============================================================
-- SCALE FIX — do the grouping / counting / dedup in Postgres.
-- The app used to fetch every row and count in JS (breaks past the
-- ~1000-row API cap, and slow either way). These views return just
-- the answers. All views are security_invoker, so each caller only
-- sees rows their RLS already allows (agents: their own; owner: all).
-- ============================================================

-- ---- Normalised handle: one canonical key per client -------------
-- "@Client", "client ", "CLIENT" all collapse to the same key, so
-- grouping and duplicate detection are reliable across agents.
alter table public.leads
  add column if not exists handle_key text
  generated always as (lower(regexp_replace(btrim(handle), '^@+', ''))) stored;

create index if not exists idx_leads_agent_handle_key
  on public.leads (agent_id, handle_key);
create index if not exists idx_leads_handle_key
  on public.leads (handle_key);

-- Karachi "today" — date_added is stored as a Karachi date by the app,
-- so day comparisons must use Karachi, not the server's UTC clock.
create or replace function public.karachi_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Karachi')::date
$$;

-- ---- One row per CLIENT (agent_id + handle_key) ------------------
-- rep_* = the most-recent outreach; first_added = the earliest; entries
-- = every outreach (for the "Reached from" chips). Multi-persona = 1 row.
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
  ) order by date_added desc, created_at desc)                    as entries
from public.leads
group by agent_id, handle_key;

-- ---- Dashboard: pipeline counts by stage (unique clients) --------
create or replace view public.pipeline_counts
with (security_invoker = on) as
select rep_stage as stage, count(*)::int as n
from public.lead_clients
group by rep_stage;

-- ---- Dashboard: per-agent client stats --------------------------
create or replace view public.agent_lead_stats
with (security_invoker = on) as
select
  agent_id,
  count(*)::int                                              as total_clients,
  count(*) filter (where first_added = public.karachi_today())::int as added_today,
  count(*) filter (where rep_stage = 'closed')::int          as closed
from public.lead_clients
group by agent_id;

-- ---- Activity: leads added per agent per day (unique clients) ----
create or replace view public.activity_leads_added
with (security_invoker = on) as
select agent_id, first_added as day, count(*)::int as n
from public.lead_clients
group by agent_id, first_added;

-- ---- Activity: follow-ups logged per agent per day --------------
create or replace view public.activity_followups
with (security_invoker = on) as
select agent_id,
       (created_at at time zone 'Asia/Karachi')::date as day,
       count(*)::int as n
from public.follow_ups
group by agent_id, (created_at at time zone 'Asia/Karachi')::date;

-- ---- Activity: deals closed per agent per day ------------------
create or replace view public.activity_deals
with (security_invoker = on) as
select agent_id, date_closed as day, count(*)::int as n
from public.deals
group by agent_id, date_closed;

-- ---- Activity: cross-agent duplicates (2+ different agents) -----
-- One row per (client handle, agent) — only for handles two or more
-- different agents have worked. Agents can't see this anyway (RLS);
-- it's for the owner/team-lead Activity page.
create or replace view public.lead_duplicate_entries
with (security_invoker = on) as
with dups as (
  select handle_key
  from public.leads
  group by handle_key
  having count(distinct agent_id) > 1
)
select distinct on (l.handle_key, l.agent_id)
  l.handle_key,
  l.agent_id,
  l.id         as lead_id,
  l.handle,
  l.date_added
from public.leads l
join dups d on d.handle_key = l.handle_key
order by l.handle_key, l.agent_id, l.date_added;

-- ---- Sales: filtered revenue totals + category breakdown --------
-- The Sales list is paginated, but its summary cards must reflect the WHOLE
-- filtered set. This computes those totals in the DB (security invoker, so an
-- agent only sums their own deals). All params optional; null = no filter.
create or replace function public.deal_summary(
  p_service  text default null,
  p_category text default null,
  p_agent    uuid default null,
  p_from     date default null,
  p_to       date default null
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with f as (
    select * from public.deals d
    where (p_service  is null or d.service          = p_service)
      and (p_category is null or d.service_category = p_category)
      and (p_agent    is null or d.agent_id         = p_agent)
      and (p_from     is null or d.date_closed      >= p_from)
      and (p_to       is null or d.date_closed      <= p_to)
  )
  select jsonb_build_object(
    'total_received', coalesce(sum(revenue_received), 0),
    'total_size',     coalesce(sum(deal_size), 0),
    'deal_count',     count(*),
    'by_category', coalesce((
      select jsonb_agg(
               jsonb_build_object('name', name, 'revenue', revenue, 'count', cnt)
               order by revenue desc)
      from (
        select coalesce(service_category, 'Uncategorized') as name,
               sum(revenue_received) as revenue,
               count(*)              as cnt
        from f
        group by coalesce(service_category, 'Uncategorized')
      ) g
    ), '[]'::jsonb)
  ) from f;
$$;

-- ---- Grants: signed-in users must be able to read the views / call the
-- functions. Row visibility is still enforced by RLS on the base tables
-- (security_invoker views) — these grants only open the objects themselves.
grant select on
  public.lead_clients,
  public.pipeline_counts,
  public.agent_lead_stats,
  public.activity_leads_added,
  public.activity_followups,
  public.activity_deals,
  public.lead_duplicate_entries
to authenticated;

grant execute on function public.karachi_today() to authenticated;
grant execute on function public.deal_summary(text, text, uuid, date, date) to authenticated;
