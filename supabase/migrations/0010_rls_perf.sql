-- ============================================================
-- RLS PERFORMANCE — wrap auth.uid() / my_role() / is_active() in a
-- scalar sub-select so Postgres evaluates them ONCE per query (an
-- initPlan) instead of once per row. Same rules, same access — only
-- faster on big scans. Scoped to the hot-path tables the app reads on
-- every page (owner-only tables stay as-is; only the owner hits them).
--
-- Wrapped in a transaction so there is never an instant where a table
-- has no policy. After running, confirm a NON-owner agent can still
-- log in and see only their own leads.
-- ============================================================

begin;

-- ---------- users ----------
drop policy if exists "read own profile; owner and team_lead read all" on public.users;
create policy "read own profile; owner and team_lead read all"
  on public.users for select
  using (id = (select auth.uid()) or (select public.my_role()) in ('owner', 'team_lead'));

drop policy if exists "owner manages users" on public.users;
create policy "owner manages users"
  on public.users for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

-- ---------- leads ----------
drop policy if exists "agent reads own leads; floor reads all" on public.leads;
create policy "agent reads own leads; floor reads all"
  on public.leads for select
  using (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner', 'team_lead'));

drop policy if exists "agent inserts own leads; owner any" on public.leads;
create policy "agent inserts own leads; owner any"
  on public.leads for insert
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent updates own leads; owner any" on public.leads;
create policy "agent updates own leads; owner any"
  on public.leads for update
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent deletes own leads; owner any" on public.leads;
create policy "agent deletes own leads; owner any"
  on public.leads for delete
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

-- ---------- follow_ups ----------
drop policy if exists "agent reads own follow_ups; floor reads all" on public.follow_ups;
create policy "agent reads own follow_ups; floor reads all"
  on public.follow_ups for select
  using (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner', 'team_lead'));

drop policy if exists "agent inserts own follow_ups; owner any" on public.follow_ups;
create policy "agent inserts own follow_ups; owner any"
  on public.follow_ups for insert
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent updates own follow_ups; owner any" on public.follow_ups;
create policy "agent updates own follow_ups; owner any"
  on public.follow_ups for update
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent deletes own follow_ups; owner any" on public.follow_ups;
create policy "agent deletes own follow_ups; owner any"
  on public.follow_ups for delete
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

-- ---------- deals ----------
drop policy if exists "agent reads own deals; floor reads all" on public.deals;
create policy "agent reads own deals; floor reads all"
  on public.deals for select
  using (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner', 'team_lead'));

drop policy if exists "agent inserts own deals; owner any" on public.deals;
create policy "agent inserts own deals; owner any"
  on public.deals for insert
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent updates own deals; owner any" on public.deals;
create policy "agent updates own deals; owner any"
  on public.deals for update
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent deletes own deals; owner any" on public.deals;
create policy "agent deletes own deals; owner any"
  on public.deals for delete
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

-- ---------- personas (persona picker reads these) ----------
drop policy if exists "read personas you manage" on public.personas;
create policy "read personas you manage"
  on public.personas for select
  using (managed_by = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "owner only" on public.personas;
create policy "owner only"
  on public.personas for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

-- ---------- active-user gate: wrap is_active() on every table ----------
do $$
declare t text;
begin
  foreach t in array array[
    'users','leads','follow_ups','deals','personas','platforms',
    'accounts','expenses','monthly_finances','training_assets','training_files'
  ]
  loop
    execute format('drop policy if exists "active users only" on public.%I', t);
    execute format(
      'create policy "active users only" on public.%I
         as restrictive to authenticated
         using ((select public.is_active())) with check ((select public.is_active()))',
      t
    );
  end loop;
end $$;

commit;
