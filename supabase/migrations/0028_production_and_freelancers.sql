-- Locks in the two-forms Production schema (idempotent — safe whether or not the
-- older 0013/0015/0016 ran) and adds the freelancer / production-house directory.

-- ── Projects (production_jobs) ───────────────────────────────
create table if not exists public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals (id) on delete set null,
  agent_id uuid not null references public.users (id),
  client_name text not null,
  job_type text not null default 'launch',
  service text not null default 'motion_graphics',
  designer text,
  status text not null default 'new',
  deadline date,
  notes text not null default '',
  intake jsonb not null default '{}'::jsonb,
  brief jsonb not null default '{}'::jsonb,
  handed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.production_jobs
  add column if not exists service text not null default 'motion_graphics',
  add column if not exists intake jsonb not null default '{}'::jsonb,
  add column if not exists brief jsonb not null default '{}'::jsonb,
  add column if not exists designer text,
  add column if not exists handed_off_at timestamptz;

alter table public.production_jobs enable row level security;

-- Clean role-based RLS (agent sees/creates own, floor reads all, owner edits).
drop policy if exists "agent reads own jobs; floor reads all" on public.production_jobs;
drop policy if exists "agent creates own jobs; owner any" on public.production_jobs;
drop policy if exists "agent updates own jobs; owner any" on public.production_jobs;
drop policy if exists "owner deletes jobs" on public.production_jobs;
drop policy if exists "agent reads own projects; floor reads all" on public.production_jobs;
drop policy if exists "agent or floor creates projects" on public.production_jobs;
drop policy if exists "own project or owner updates" on public.production_jobs;
drop policy if exists "owner deletes projects" on public.production_jobs;
drop policy if exists "owner only" on public.production_jobs;
drop policy if exists "proj read own or floor" on public.production_jobs;
drop policy if exists "proj create own or floor" on public.production_jobs;
drop policy if exists "proj update own or owner" on public.production_jobs;
drop policy if exists "proj delete owner" on public.production_jobs;

create policy "proj read own or floor" on public.production_jobs for select
  using (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner','team_lead'));
create policy "proj create own or floor" on public.production_jobs for insert
  with check (agent_id = (select auth.uid()) or (select public.my_role()) in ('owner','team_lead'));
create policy "proj update own or owner" on public.production_jobs for update
  using (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner')
  with check (agent_id = (select auth.uid()) or (select public.my_role()) = 'owner');
create policy "proj delete owner" on public.production_jobs for delete
  using ((select public.my_role()) = 'owner');

drop policy if exists "active users only" on public.production_jobs;
create policy "active users only" on public.production_jobs
  as restrictive to authenticated
  using (public.is_active()) with check (public.is_active());

-- ── SOP checklist (production_steps) — owner-only workspace ───
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

drop policy if exists "read steps of visible jobs" on public.production_steps;
drop policy if exists "write steps of editable jobs" on public.production_steps;
drop policy if exists "owner only" on public.production_steps;
create policy "owner only" on public.production_steps for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

drop policy if exists "active users only" on public.production_steps;
create policy "active users only" on public.production_steps
  as restrictive to authenticated
  using (public.is_active()) with check (public.is_active());

-- ── Freelancers / production houses (owner-only) ─────────────
create table if not exists public.freelancers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'freelancer'
    check (kind in ('freelancer', 'production_house')),
  services text[] not null default '{}',
  email text,
  phone text,
  rate text,
  portfolio_url text,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.freelancers enable row level security;

drop policy if exists "freelancers owner all" on public.freelancers;
create policy "freelancers owner all" on public.freelancers for all
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');
