-- ============================================================
-- Attendance — one row per person per day, marked manually by the owner.
-- Statuses: present (P), late (L), half_day (HD), absent (A).
-- Agents see only their own; the owner sees and marks everyone.
-- ============================================================

create type public.attendance_status as enum
  ('present', 'late', 'half_day', 'absent');

create table public.attendance (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  date       date not null,
  status     public.attendance_status not null,
  note       text,
  marked_by  uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index attendance_user_date_idx on public.attendance (user_id, date);
create index attendance_date_idx on public.attendance (date);

alter table public.attendance enable row level security;

-- Everyone can read their own attendance; the owner can read all of it.
-- (Team leads see only their own — attendance feeds salary, so it stays private.)
create policy "read own attendance; owner reads all"
  on public.attendance for select
  using (user_id = auth.uid() or public.my_role() = 'owner');

-- Only the owner marks attendance (insert / update / delete).
create policy "owner marks attendance"
  on public.attendance for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');
