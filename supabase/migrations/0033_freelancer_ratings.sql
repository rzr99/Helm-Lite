-- Adjustable per-criterion ratings for freelancers (0 = not rated, 1-5 stars).
-- Editable anytime from the freelancer's page. Idempotent.
alter table public.freelancers
  add column if not exists rating_quality       int not null default 0 check (rating_quality between 0 and 5),
  add column if not exists rating_price         int not null default 0 check (rating_price between 0 and 5),
  add column if not exists rating_speed         int not null default 0 check (rating_speed between 0 and 5),
  add column if not exists rating_communication int not null default 0 check (rating_communication between 0 and 5);
