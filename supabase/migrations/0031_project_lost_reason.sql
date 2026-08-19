-- A place to record WHY a production project was marked lost. Owner fills it on
-- the project page when status = 'lost'. Nullable, uses the existing
-- production_jobs RLS (owner/creator can update). Idempotent.

alter table public.production_jobs
  add column if not exists lost_reason text;
