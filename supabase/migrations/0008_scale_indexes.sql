-- ============================================================
-- SCALE PREP — indexes for the queries the app actually runs.
-- Postgres does NOT auto-index foreign keys, so today every lead/
-- follow-up/deal lookup is a full-table scan. Cheap now, painful at
-- tens of agents x thousands of rows. All additive + idempotent.
-- ============================================================

-- Leads: filtered by agent (RLS + agent filter), sorted by date_added,
-- filtered by stage. (The normalised-handle index lives in 0009, alongside
-- the handle_key column it depends on.)
create index if not exists idx_leads_agent_id      on public.leads (agent_id);
create index if not exists idx_leads_date_added     on public.leads (date_added);
create index if not exists idx_leads_stage          on public.leads (stage);

-- Follow-ups: joined by lead, scoped by agent, dashboard reads only open ones.
create index if not exists idx_follow_ups_lead_id   on public.follow_ups (lead_id);
create index if not exists idx_follow_ups_agent_id  on public.follow_ups (agent_id);
create index if not exists idx_follow_ups_open       on public.follow_ups (due_date) where done = false;

-- Deals: scoped by agent, linked to a lead, sorted/aggregated by close date.
create index if not exists idx_deals_agent_id       on public.deals (agent_id);
create index if not exists idx_deals_lead_id        on public.deals (lead_id);
create index if not exists idx_deals_date_closed    on public.deals (date_closed);

-- Personas & accounts: the persona picker reads managed_by; accounts join persona.
create index if not exists idx_personas_managed_by  on public.personas (managed_by);
create index if not exists idx_accounts_persona_id  on public.accounts (persona_id);
