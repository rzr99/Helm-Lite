-- Training file attachments: Supabase Storage bucket + metadata table.

insert into storage.buckets (id, name, public, file_size_limit)
values ('training', 'training', false, 52428800)
on conflict (id) do nothing;

create policy "training files readable by signed-in users"
  on storage.objects for select to authenticated
  using (bucket_id = 'training');

create policy "training files uploaded by owner"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'training' and public.my_role() = 'owner');

create policy "training files deleted by owner"
  on storage.objects for delete to authenticated
  using (bucket_id = 'training' and public.my_role() = 'owner');

create table public.training_files (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.training_assets (id) on delete cascade,
  name text not null,
  path text not null,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.training_files enable row level security;

create policy "any signed-in user can read"
  on public.training_files for select
  using (auth.uid() is not null);

create policy "owner writes"
  on public.training_files for insert
  with check (public.my_role() = 'owner');

create policy "owner deletes"
  on public.training_files for delete
  using (public.my_role() = 'owner');
