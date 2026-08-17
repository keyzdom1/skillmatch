-- SkillMatch core schema, RLS, pgvector embeddings, storage buckets.
-- Run in Supabase SQL editor (or via supabase CLI: supabase db push).

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  bio text,
  skills text[] not null default '{}',
  education text,
  experience text,
  resume_url text,
  avatar_url text,
  embedding vector(384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  company text,
  location text,
  type text not null default 'internship',
  deadline date,
  skills text[] not null default '{}',
  is_active boolean not null default true,
  embedding vector(384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (profile_id, opportunity_id)
);

-- ---------------------------------------------------------------------------
-- Embedding indexes
-- ---------------------------------------------------------------------------

create index if not exists opportunities_embedding_idx
  on public.opportunities using hnsw (embedding vector_cosine_ops);

create index if not exists profiles_embedding_idx
  on public.profiles using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists opportunities_updated_at on public.opportunities;
create trigger opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.applications enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "opportunities_select_public" on public.opportunities;
create policy "opportunities_select_public" on public.opportunities
  for select using (true);

drop policy if exists "opportunities_insert_own" on public.opportunities;
create policy "opportunities_insert_own" on public.opportunities
  for insert with check (auth.uid() = employer_id);

drop policy if exists "opportunities_update_own" on public.opportunities;
create policy "opportunities_update_own" on public.opportunities
  for update using (auth.uid() = employer_id);

drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own" on public.applications
  for select using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.opportunities o
      where o.id = applications.opportunity_id and o.employer_id = auth.uid()
    )
  );

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own" on public.applications
  for insert with check (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "resumes_upload_own" on storage.objects;
create policy "resumes_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_read_own" on storage.objects;
create policy "resumes_read_own" on storage.objects
  for select using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_upload_own" on storage.objects;
create policy "avatars_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_read_own" on storage.objects;
create policy "avatars_read_own" on storage.objects
  for select using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
