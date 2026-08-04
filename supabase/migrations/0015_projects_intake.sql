-- Projects & intake / handoff.
--
-- production_jobs becomes the "project": an agent or team lead collects intake
-- from the client and hands it off to the owner, who assigns an editor and runs
-- production. Adds the service, the intake data (jsonb), and the handoff time.
--
-- RLS: an agent sees/creates their own projects; the floor (owner + team_lead)
-- sees all; the owner edits all. The production_steps checklist (the SOP line)
-- stays OWNER-ONLY — that's the owner's production workspace. Idempotent.

alter table public.production_jobs
  add column if not exists service text not null default 'motion_graphics',
  add column if not exists intake jsonb not null default '{}'::jsonb,
  add column if not exists handed_off_at timestamptz;

create index if not exists production_jobs_service_idx on public.production_jobs (service);

-- Reset production_jobs policies to the role-based model (replaces any earlier
-- owner-only or agent/floor variants from 0013 / 0014).
drop policy if exists "agent reads own jobs; floor reads all" on public.production_jobs;
drop policy if exists "agent creates own jobs; owner any" on public.production_jobs;
drop policy if exists "agent updates own jobs; owner any" on public.production_jobs;
drop policy if exists "owner deletes jobs" on public.production_jobs;
drop policy if exists "owner only" on public.production_jobs;

create policy "agent reads own projects; floor reads all"
  on public.production_jobs for select
  using (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner','team_lead'));

create policy "agent or floor creates projects"
  on public.production_jobs for insert
  with check (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner','team_lead'));

create policy "own project or owner updates"
  on public.production_jobs for update
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

create policy "owner deletes projects"
  on public.production_jobs for delete
  using ((select public.my_role()) = 'owner');

-- production_steps: the SOP line stays owner-only.
drop policy if exists "read steps of visible jobs" on public.production_steps;
drop policy if exists "write steps of editable jobs" on public.production_steps;
drop policy if exists "owner only" on public.production_steps;

create policy "owner only" on public.production_steps for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');
