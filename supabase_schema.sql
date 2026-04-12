-- LWC Studio Complete Supabase Schema
-- Updated: Flattened architecture — components owned directly by user_id
-- Projects table removed. Components link directly to auth.users.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COMPONENTS (owned directly by user, no projects layer)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.components (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  name             text not null,
  html_content     text,
  js_content       text,
  css_content      text,
  last_deploy_hash text,  -- SHA-256 of last successfully deployed code (for cache check)
  created_at       timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at       timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, name)  -- prevent duplicate component names per user
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VERSIONS (history snapshots per component)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.versions (
  id           uuid default gen_random_uuid() primary key,
  component_id uuid references public.components on delete cascade not null,
  html_content text,
  js_content   text,
  css_content  text,
  created_at   timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SALESFORCE_CONNECTIONS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.salesforce_connections (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null unique,
  org_id       text,
  sf_user_id   text,
  instance_url text,
  access_token text,     -- NOTE: encrypt these at rest in production
  refresh_token text,    -- NOTE: encrypt these at rest in production
  token_expiry timestamp with time zone,
  updated_at   timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at   timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.components            enable row level security;
alter table public.versions              enable row level security;
alter table public.salesforce_connections enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_components_user_id      on public.components(user_id);
create index if not exists idx_versions_component_id   on public.versions(component_id);
create index if not exists idx_sf_connections_user_id  on public.salesforce_connections(user_id);
create index if not exists idx_profiles_email          on public.profiles(email);  -- for O(1) OAuth lookup

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles: users can only see and edit their own profile
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using ( auth.uid() = id );

-- Components: direct user_id ownership
create policy "Components are manageable by owner"
  on public.components for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Versions: accessible if the component belongs to the requesting user
create policy "Versions are manageable by component owner"
  on public.versions for all
  using (
    exists (
      select 1 from public.components
      where components.id = versions.component_id
        and components.user_id = auth.uid()
    )
  );

-- Salesforce connections: own user only
create policy "Connections are manageable by owner"
  on public.salesforce_connections for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at on components
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_components_updated on public.components;
create trigger on_components_updated
  before update on public.components
  for each row execute procedure public.handle_updated_at();

-- Auto-create profile on new Salesforce-authenticated user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;  -- idempotent: don't overwrite existing profiles
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
