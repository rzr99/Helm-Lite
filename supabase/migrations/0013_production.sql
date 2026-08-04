-- Production module — jobs running down the Motion Graphics assembly line.
--
-- A job picks a type; on creation the app seeds that type's stations as a
-- checklist (production_steps). A job can only be marked Delivered/Paid once
-- every step is ticked — enforced in the app; these tables just hold state.
--
-- RLS mirrors public.deals: an agent sees/edits their own jobs, the floor
-- (owner/team_lead) reads all, the owner edits all. auth.uid()/my_role() are
-- wrapped in (select ...) for the per-query perf pattern used in 0010, and the
-- "active users only" RESTRICTIVE policy matches 0005. Idempotent: safe to re-run.

create table if not exists public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals (id) on delete set null,
  agent_id uuid not null references public.users (id),
  client_name text not null,
  job_type text not null default 'launch',
  designer text,
  status text not null default 'briefed',
  deadline date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.production_jobs enable row level security;

create index if not exists production_jobs_agent_idx on public.production_jobs (agent_id);
create index if not exists production_jobs_status_idx on public.production_jobs (status);
create index if not exists production_jobs_deal_idx on public.production_jobs (deal_id);

drop policy if exists "agent reads own jobs; floor reads all" on public.production_jobs;
create policy "agent reads own jobs; floor reads all"
  on public.production_jobs for select
  using (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner','team_lead'));

drop policy if exists "agent creates own jobs; owner any" on public.production_jobs;
create policy "agent creates own jobs; owner any"
  on public.production_jobs for insert
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "agent updates own jobs; owner any" on public.production_jobs;
create policy "agent updates own jobs; owner any"
  on public.production_jobs for update
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');

drop policy if exists "owner deletes jobs" on public.production_jobs;
create policy "owner deletes jobs"
  on public.production_jobs for delete
  using ((select public.my_role()) = 'owner');


create table if not exists public.production_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.production_jobs (id) on delete cascade,
  station_key text not null,
  label text not null,
  is_gate boolean not null default false,
  sort int not null default 0,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.production_steps enable row level security;

create index if not exists production_steps_job_idx on public.production_steps (job_id);

-- Steps inherit their parent job's access.
drop policy if exists "read steps of visible jobs" on public.production_steps;
create policy "read steps of visible jobs"
  on public.production_steps for select
  using (exists (
    select 1 from public.production_jobs j
    where j.id = job_id
      and (j.agent_id = (select auth.uid()) or (select public.my_role()) in ('owner','team_lead'))
  ));

drop policy if exists "write steps of editable jobs" on public.production_steps;
create policy "write steps of editable jobs"
  on public.production_steps for all
  using (exists (
    select 1 from public.production_jobs j
    where j.id = job_id
      and (j.agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  ))
  with check (exists (
    select 1 from public.production_jobs j
    where j.id = job_id
      and (j.agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  ));

-- Active-user enforcement (mirrors 0005).
drop policy if exists "active users only" on public.production_jobs;
create policy "active users only" on public.production_jobs
  as restrictive to authenticated
  using (public.is_active()) with check (public.is_active());

drop policy if exists "active users only" on public.production_steps;
create policy "active users only" on public.production_steps
  as restrictive to authenticated
  using (public.is_active()) with check (public.is_active());
