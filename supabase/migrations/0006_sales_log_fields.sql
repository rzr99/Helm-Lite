-- Expand deals to match the owner's real sales log:
-- free-text service, payment method, merchant, social platform, designer.
-- (Remaining amount is computed in the app as deal_size - revenue_received.)

alter table public.deals
  add column if not exists service text,
  add column if not exists service_category text,
  add column if not exists payment_method text,
  add column if not exists merchant_name text,
  add column if not exists social_platform text,
  add column if not exists designer text;

-- Carry any existing enum value into the new free-text field.
update public.deals set service = service_type::text where service is null;

-- The old fixed service enum is no longer required.
alter table public.deals alter column service_type drop not null;
