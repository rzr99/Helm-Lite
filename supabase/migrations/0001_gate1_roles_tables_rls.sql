-- ============================================================
-- HELM LITE — GATE 1: roles, tables, row-level security
-- Every table locked down at the database level.
-- ============================================================

-- ---------- Roles ----------
create type public.user_role as enum ('owner', 'team_lead', 'agent');

-- Profile table extending Supabase auth users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'agent',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Helper: the current signed-in user's role.
-- security definer so policies on users itself don't recurse.
create or replace function public.my_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

-- Auto-create a profile row whenever an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "read own profile; owner and team_lead read all"
  on public.users for select
  using (id = auth.uid() or public.my_role() in ('owner', 'team_lead'));

create policy "owner manages users"
  on public.users for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

-- ---------- Shared enums ----------
create type public.service_type as enum
  ('motion_graphics', 'video_editing', 'branding', 'other');

create type public.lead_stage as enum
  ('new', 'in_conversation', 'qualified', 'closed', 'lost');

-- ---------- Leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.users (id),
  handle text not null,
  name text,
  service_interest public.service_type,
  source text,
  stage public.lead_stage not null default 'new',
  date_added date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "agent reads own leads; floor reads all"
  on public.leads for select
  using (agent_id = auth.uid() or public.my_role() in ('owner', 'team_lead'));

create policy "agent inserts own leads; owner any"
  on public.leads for insert
  with check (agent_id = auth.uid() or public.my_role() = 'owner');

create policy "agent updates own leads; owner any"
  on public.leads for update
  using (agent_id = auth.uid() or public.my_role() = 'owner')
  with check (agent_id = auth.uid() or public.my_role() = 'owner');

create policy "agent deletes own leads; owner any"
  on public.leads for delete
  using (agent_id = auth.uid() or public.my_role() = 'owner');

-- ---------- Follow-ups ----------
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  agent_id uuid not null references public.users (id),
  due_date date not null,
  done boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.follow_ups enable row level security;

create policy "agent reads own follow_ups; floor reads all"
  on public.follow_ups for select
  using (agent_id = auth.uid() or public.my_role() in ('owner', 'team_lead'));

create policy "agent inserts own follow_ups; owner any"
  on public.follow_ups for insert
  with check (agent_id = auth.uid() or public.my_role() = 'owner');

create policy "agent updates own follow_ups; owner any"
  on public.follow_ups for update
  using (agent_id = auth.uid() or public.my_role() = 'owner')
  with check (agent_id = auth.uid() or public.my_role() = 'owner');

create policy "agent deletes own follow_ups; owner any"
  on public.follow_ups for delete
  using (agent_id = auth.uid() or public.my_role() = 'owner');

-- ---------- Deals ----------
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  agent_id uuid not null references public.users (id),
  client_name text not null,
  service_type public.service_type not null default 'other',
  deal_size numeric(12, 2) not null default 0,
  revenue_received numeric(12, 2) not null default 0,
  date_closed date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.deals enable row level security;

create policy "agent reads own deals; floor reads all"
  on public.deals for select
  using (agent_id = auth.uid() or public.my_role() in ('owner', 'team_lead'));

create policy "agent inserts own deals; owner any"
  on public.deals for insert
  with check (agent_id = auth.uid() or public.my_role() = 'owner');

create policy "agent updates own deals; owner any"
  on public.deals for update
  using (agent_id = auth.uid() or public.my_role() = 'owner')
  with check (agent_id = auth.uid() or public.my_role() = 'owner');

create policy "agent deletes own deals; owner any"
  on public.deals for delete
  using (agent_id = auth.uid() or public.my_role() = 'owner');

-- ---------- Personas (owner only) ----------
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  persona_name text not null,
  managed_by uuid references public.users (id),
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

alter table public.personas enable row level security;

create policy "owner only"
  on public.personas for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

-- ---------- Platforms (extensible list, not a hard-coded enum) ----------
create table public.platforms (
  name text primary key
);

insert into public.platforms (name)
values ('x'), ('discord'), ('instagram'), ('threads'), ('other');

alter table public.platforms enable row level security;

create policy "owner only"
  on public.platforms for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

-- ---------- Accounts (owner only) ----------
create type public.account_status as enum
  ('active', 'warming', 'recovery', 'banned', 'reserve');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  platform text not null references public.platforms (name),
  handle text not null,
  subscription_date date,
  renewal_date date,
  assigned_card text,   -- reference label only, never a card number
  assigned_proxy text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "owner only"
  on public.accounts for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

-- ---------- Expenses (owner only) ----------
create type public.expense_category as enum
  ('proxy', 'vcc', 'premium', 'account_purchase', 'production_house', 'other');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category public.expense_category not null default 'other',
  description text not null default '',
  amount numeric(12, 2) not null,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "owner only"
  on public.expenses for all
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

-- ---------- Training assets (everyone reads, owner writes) ----------
create table public.training_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  category text,
  created_at timestamptz not null default now()
);

alter table public.training_assets enable row level security;

create policy "any signed-in user can read"
  on public.training_assets for select
  using (auth.uid() is not null);

create policy "owner writes"
  on public.training_assets for insert
  with check (public.my_role() = 'owner');

create policy "owner updates"
  on public.training_assets for update
  using (public.my_role() = 'owner')
  with check (public.my_role() = 'owner');

create policy "owner deletes"
  on public.training_assets for delete
  using (public.my_role() = 'owner');
