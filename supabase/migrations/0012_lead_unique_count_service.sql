-- Add a service filter to the leads unique-client count so it matches the
-- Leads list when someone filters by service type. Adding a parameter changes
-- the function signature, so drop the old one first, then recreate.
drop function if exists public.lead_unique_count(text, uuid, date, date, text);

create or replace function public.lead_unique_count(
  p_stage   text default null,
  p_service text default null,
  p_agent   uuid default null,
  p_from    date default null,
  p_to      date default null,
  p_search  text default null
) returns int
language sql stable security invoker
set search_path = public
as $$
  select count(distinct handle_key)::int
  from public.lead_clients
  where (p_stage   is null or rep_stage::text   = p_stage)
    and (p_service is null or rep_service::text = p_service)
    and (p_agent   is null or agent_id          = p_agent)
    and (p_from    is null or rep_date_added    >= p_from)
    and (p_to      is null or rep_date_added    <= p_to)
    and (p_search is null or trim(p_search) = '' or
         search_text like all(
           array(
             select '%' || tok || '%'
             from unnest(string_to_array(lower(trim(p_search)), ' ')) tok
             where tok <> ''
           )
         ));
$$;

grant execute on function public.lead_unique_count(text, text, uuid, date, date, text) to authenticated;
