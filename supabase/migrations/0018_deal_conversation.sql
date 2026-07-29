-- Where the client conversation continues after the deal closes (WhatsApp,
-- Slack, Instagram, X, …). The existing social_platform column is now shown
-- in the UI as "Lead source" (where the lead came from) — no rename needed.
alter table public.deals add column if not exists conversation text;
