-- Hiring: interview candidates + their CV files. Owner-only.

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_applied text not null default '',
  email text,
  phone text,
  interview_date date,
  status text not null default 'applied'
    check (status in ('applied', 'interviewing', 'hired', 'rejected')),
  rating int not null default 0 check (rating between 0 and 5),
  notes text not null default '',
  cv_path text,
  cv_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_candidates_created on public.candidates (created_at desc);

alter table public.candidates enable row level security;

drop policy if exists "candidates owner all" on public.candidates;
create policy "candidates owner all" on public.candidates
  for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

-- Private bucket for CVs (photo or document), owner-only.
insert into storage.buckets (id, name, public, file_size_limit)
values ('cvs', 'cvs', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "cv files read by owner" on storage.objects;
create policy "cv files read by owner"
  on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and public.my_role() = 'owner');

drop policy if exists "cv files insert by owner" on storage.objects;
create policy "cv files insert by owner"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and public.my_role() = 'owner');

drop policy if exists "cv files delete by owner" on storage.objects;
create policy "cv files delete by owner"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and public.my_role() = 'owner');
