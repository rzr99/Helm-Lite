-- The team's real account states are Healthy / Warming up / Ghost banned /
-- DM restricted / Banned / Reserve. Only "Ghost banned" is a new DB value —
-- "DM restricted" reuses the existing 'restricted' value. Idempotent.
alter type public.account_status add value if not exists 'ghost_banned';
