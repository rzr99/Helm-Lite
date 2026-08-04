-- Simple money tracking on a project: deposit at the start, balance at the end.
-- Idempotent.
alter table public.production_jobs
  add column if not exists deposit_received boolean not null default false,
  add column if not exists balance_received boolean not null default false;
