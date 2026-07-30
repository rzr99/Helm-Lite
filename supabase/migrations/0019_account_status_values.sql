-- Two more account health states the team tracks. "active" stays the DB value
-- for healthy accounts (shown as "Healthy" in the UI). Idempotent.
alter type public.account_status add value if not exists 'restricted';
alter type public.account_status add value if not exists 'compromised';
