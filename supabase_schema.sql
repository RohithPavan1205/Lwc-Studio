-- LWC Studio Complete Supabase Schema (Flattened)
-- Includes tables, RLS policies, indexes, and triggers

-- 1. Create PROFILES table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create COMPONENTS table (Flattened: direct to user)
create table if not exists public.components (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  html_content text,
  js_content text,
  css_content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create VERSIONS table
create table if not exists public.versions (
  id uuid default gen_random_uuid() primary key,
  component_id uuid references public.components on delete cascade not null,
  html_content text,
  js_content text,
  css_content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create SALESFORCE_CONNECTIONS table
create table if not exists public.salesforce_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  org_id text,
  sf_user_id text,
  instance_url text,
  access_token text,
  refresh_token text,
  token_expiry timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create TEMPLATES table
create table if not exists public.templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  category text,
  preview_gif_url text,
  preview_html_url text,
  html_content text,
  js_content text,
  css_content text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLING RLS
alter table public.profiles enable row level security;
alter table public.components enable row level security;
alter table public.versions enable row level security;
alter table public.salesforce_connections enable row level security;
alter table public.templates enable row level security;

-- INDEXES for Performance
create index if not exists idx_components_user_id on public.components(user_id);
create index if not exists idx_versions_component_id on public.versions(component_id);
create index if not exists idx_salesforce_connections_user_id on public.salesforce_connections(user_id);

-- RLS POLICIES

-- Profiles: Own user only
create policy "Profiles are viewable by owner" on public.profiles
  for select using ( auth.uid() = id );
create policy "Profiles are updatable by owner" on public.profiles
  for update using ( auth.uid() = id );

-- Components: Own user only
create policy "Components are manageable by owner" on public.components
  for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Versions: Verify ownership via component
create policy "Versions are manageable by component owner" on public.versions
  for all using (
    exists (
      select 1 from public.components
      where components.id = versions.component_id
      and components.user_id = auth.uid()
    )
  );

-- Salesforce Connections: Own user only
create policy "Connections are manageable by owner" on public.salesforce_connections
  for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Templates: Global Read, Admin only Write (Assumed)
create policy "Templates are readable by everyone" on public.templates
  for select using ( is_active = true );

-- TRIGGERS & FUNCTIONS

-- 1. Automating updated_at for Components
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_components_updated
  before update on public.components
  for each row execute procedure public.handle_updated_at();

-- 2. Automating Profile Creation on Auth Signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
