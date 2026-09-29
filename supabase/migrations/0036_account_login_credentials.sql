-- Store the login email + password on each account, so the team has the
-- credentials in one place. Password is intentionally NOT stored for X (our
-- most-worked platform) — that stays managed separately; the app forces it to
-- null for X regardless of what is submitted. These are operational social
-- logins (not app auth), so they're kept as plaintext to remain usable; the
-- accounts table is owner-only via RLS and Postgres encrypts data at rest.
alter table public.accounts
  add column if not exists login_email    text,
  add column if not exists login_password text;
