-- Add a "Ghosted" pipeline stage for clients who went silent — distinct from
-- "Lost" (explicit no / asked us not to message). Inserted just before 'lost'
-- in the enum. Idempotent (Postgres 12+). Run as a standalone statement.
alter type public.lead_stage add value if not exists 'ghosted' before 'lost';
