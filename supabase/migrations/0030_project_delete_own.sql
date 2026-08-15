-- Let the agent who created a project delete it (not just the owner), so an
-- agent can remove a mistaken/duplicate handoff themselves. Owner can still
-- delete any. Editing their own was already allowed (proj update own or owner).
-- production_steps cascade away via the ON DELETE CASCADE FK. Idempotent.

drop policy if exists "proj delete owner" on public.production_jobs;
drop policy if exists "proj delete own or owner" on public.production_jobs;
create policy "proj delete own or owner" on public.production_jobs for delete
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');
