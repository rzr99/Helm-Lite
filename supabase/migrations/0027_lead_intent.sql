-- Lead type: high intent vs cold outreach. A plain label on each lead — no new
-- table relations, so nothing to make joins ambiguous. Existing leads default
-- to 'high_intent' (the larger pile); re-tag any to 'cold_outreach' later.

alter table public.leads
  add column if not exists intent text not null default 'high_intent';

alter table public.leads
  drop constraint if exists leads_intent_check;
alter table public.leads
  add constraint leads_intent_check
  check (intent in ('high_intent', 'cold_outreach'));

-- Surface the client's most-recent intent on the grouped view. Appended at the
-- END so `create or replace` accepts it (every existing column is unchanged, so
-- the dependent views — pipeline_counts, agent_lead_stats, activity_* — keep
-- working exactly as before).
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
group by agent_id, handle_key;
