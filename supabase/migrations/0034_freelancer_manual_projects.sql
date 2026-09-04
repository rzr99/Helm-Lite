-- A manual starting count of projects a freelancer did before Helm (or off
-- the system). Delivered projects assigned to them in Helm are counted
-- automatically and added on top. Idempotent.
alter table public.freelancers
  add column if not exists manual_projects int not null default 0
    check (manual_projects >= 0);
