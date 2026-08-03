-- Lead assignment inbox.
--
-- A lead can be OFFERED to another agent via `assigned_to` WITHOUT changing its
-- ownership (`agent_id`) until that agent accepts it. This keeps transferred
-- leads separate from the receiver's own list and counts (which group by
-- agent_id) — they show up in a dedicated "Assigned to me" inbox where the
-- agent can accept them (one by one or all) or work them directly. On accept,
-- agent_id becomes the new agent and assigned_to clears.

alter table public.leads
  add column if not exists assigned_to uuid references public.users (id);

create index if not exists idx_leads_assigned_to on public.leads (assigned_to);

-- Additive permissive policies (OR-ed with the existing ones): let the assignee
-- SEE and WORK/ACCEPT leads offered to them. Owner/floor visibility unchanged.
drop policy if exists "assignee reads assigned leads" on public.leads;
create policy "assignee reads assigned leads"
  on public.leads for select
  using (assigned_to = (select auth.uid()));

drop policy if exists "assignee works assigned leads" on public.leads;
create policy "assignee works assigned leads"
  on public.leads for update
  using (assigned_to = (select auth.uid()))
  with check (
    assigned_to = (select auth.uid()) or agent_id = (select auth.uid())
  );
