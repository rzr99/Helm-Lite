-- Which persona/account the agent reached out from — a memory aid for
-- follow-ups, NOT a duplicate key. Duplicates stay keyed on the agent.
alter table public.leads add column if not exists persona text;

-- Let agents see the personas assigned to them (managed_by) so the lead form
-- can offer them as choices. Owner still sees all; accounts stay owner-only.
create policy "read personas you manage"
  on public.personas for select
  using (managed_by = auth.uid() or public.my_role() = 'owner');
