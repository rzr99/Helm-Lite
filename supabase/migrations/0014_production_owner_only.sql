-- Restrict Production to the OWNER only.
--
-- Replaces the agent/floor policies from 0013 with a single owner-only policy
-- per table. The "active users only" RESTRICTIVE policies from 0013 stay in
-- force (AND-ed on top). Net effect: only the owner can see or touch any
-- production job or step. Idempotent — safe to re-run.

-- production_jobs
drop policy if exists "agent reads own jobs; floor reads all" on public.production_jobs;
drop policy if exists "agent creates own jobs; owner any" on public.production_jobs;
drop policy if exists "agent updates own jobs; owner any" on public.production_jobs;
drop policy if exists "owner deletes jobs" on public.production_jobs;

drop policy if exists "owner only" on public.production_jobs;
create policy "owner only" on public.production_jobs for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

-- production_steps
drop policy if exists "read steps of visible jobs" on public.production_steps;
drop policy if exists "write steps of editable jobs" on public.production_steps;

drop policy if exists "owner only" on public.production_steps;
create policy "owner only" on public.production_steps for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');
