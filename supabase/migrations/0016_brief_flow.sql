-- Slice 1 — the brief flow (Steps 2–6) on a project.
--
-- phase tracks where the project is in the CD workflow:
--   new → waiting_client → brief → brief_ready  (later slices continue from here)
-- Everything the CD builds lives in `brief` (jsonb). `chase` holds the
-- missing-items list + when the wait started. `overrides` logs any hard-stop
-- the CD pushed past, with the typed reason. Idempotent.

alter table public.production_jobs
  add column if not exists phase text not null default 'new',
  add column if not exists brief jsonb not null default '{}'::jsonb,
  add column if not exists client_deadline date,
  add column if not exists editor_deadline timestamptz,
  add column if not exists revision_rounds int,
  add column if not exists is_rush boolean not null default false,
  add column if not exists chase jsonb not null default '{}'::jsonb,
  add column if not exists overrides jsonb not null default '[]'::jsonb;

create index if not exists production_jobs_phase_idx on public.production_jobs (phase);
