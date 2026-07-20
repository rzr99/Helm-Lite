-- Profile pictures: avatar column, self-service profile updates,
-- and a public avatars bucket where each user manages their own image.

alter table public.users add column if not exists avatar_url text;

create policy "users update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Non-owners can update their own row (name, avatar) but any attempt
-- to change role or active is silently reverted.
create or replace function public.protect_user_fields()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.my_role() is distinct from 'owner' then
    new.role := old.role;
    new.active := old.active;
  end if;
  return new;
end;
$$;

create trigger protect_user_fields
  before update on public.users
  for each row execute function public.protect_user_fields();

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users add own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users replace own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users remove own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
