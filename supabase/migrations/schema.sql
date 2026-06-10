-- =============================================================================
-- APP-TASKS: Full Supabase Schema
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- It is safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- =============================================================================

-- 0. Enable pgvector extension for semantic AI search
create extension if not exists vector;

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. Chat Sessions + Messages (AI memory & history)
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Alarms Table
create table if not exists public.alarms (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  time       text not null,           -- "08:30"
  label      text not null default 'Alarma',
  days       text[] default array[]::text[],  -- ["Mon","Tue"...]
  active     boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. User Profiles Table (display name + avatar photo)
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  avatar_base64 text, -- base64-encoded image data URL
  created_at   timestamptz default timezone('utc'::text, now()) not null,
  updated_at   timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Rules / Habits Table
create table if not exists public.rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  label       text not null,
  description text,
  days        text[] default array[]::text[],
  active      boolean default true not null,
  created_at  timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Rule Completion Log (habit streaks)
create table if not exists public.rule_logs (
  id         uuid primary key default gen_random_uuid(),
  rule_id    uuid references public.rules(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       date not null,
  completed  boolean default false not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (rule_id, date)
);

-- 5. Tasks Table
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  label       text not null,
  description text,
  completed   boolean default false not null,
  due_date    timestamptz,
  created_at  timestamptz default timezone('utc'::text, now()) not null
);

-- 6. Notes Table
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  content    text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 7. Vector Documents Table (AI context / RAG)
create table if not exists public.user_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  content    text not null,
  embedding  vector(1024) not null,
  metadata   jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- =============================================================================
-- INDEXES (for query performance)
-- =============================================================================
create index if not exists idx_messages_session    on public.messages(session_id);
create index if not exists idx_messages_user       on public.messages(user_id);
create index if not exists idx_alarms_user         on public.alarms(user_id);
create index if not exists idx_rules_user          on public.rules(user_id);
create index if not exists idx_rule_logs_user      on public.rule_logs(user_id);
create index if not exists idx_tasks_user          on public.tasks(user_id);
create index if not exists idx_notes_user          on public.notes(user_id);
create index if not exists idx_user_docs_user      on public.user_documents(user_id);
create index if not exists idx_profiles_user       on public.profiles(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (users can only see their own data)
-- =============================================================================
alter table public.messages       enable row level security;
alter table public.alarms         enable row level security;
alter table public.profiles       enable row level security;
alter table public.rules          enable row level security;
alter table public.rule_logs      enable row level security;
alter table public.tasks          enable row level security;
alter table public.notes          enable row level security;
alter table public.user_documents enable row level security;

-- Drop old policies if they exist (so re-runs don't error)
do $$ begin
  drop policy if exists "Users can modify their own messages"            on public.messages;
  drop policy if exists "Users can modify their own alarms"              on public.alarms;
  drop policy if exists "Users can modify their own rules"               on public.rules;
  drop policy if exists "Users can modify their own rule logs"           on public.rule_logs;
  drop policy if exists "Users can modify their own tasks"               on public.tasks;
  drop policy if exists "Users can modify their own notes"               on public.notes;
  drop policy if exists "Users can modify their own document embeddings" on public.user_documents;
  drop policy if exists "Users can manage their own profile"             on public.profiles;
exception when others then null;
end $$;

-- Create RLS policies
create policy "Users can modify their own messages"
  on public.messages for all using (auth.uid() = user_id);

create policy "Users can modify their own alarms"
  on public.alarms for all using (auth.uid() = user_id);

create policy "Users can modify their own rules"
  on public.rules for all using (auth.uid() = user_id);

create policy "Users can modify their own rule logs"
  on public.rule_logs for all using (auth.uid() = user_id);

create policy "Users can modify their own tasks"
  on public.tasks for all using (auth.uid() = user_id);

create policy "Users can modify their own notes"
  on public.notes for all using (auth.uid() = user_id);

create policy "Users can modify their own document embeddings"
  on public.user_documents for all using (auth.uid() = user_id);

create policy "Users can manage their own profile"
  on public.profiles for all using (auth.uid() = user_id);

-- =============================================================================
-- VECTOR SEARCH FUNCTION (callable via Supabase RPC)
-- =============================================================================
create or replace function public.match_user_documents (
  query_embedding  vector(1024),
  match_threshold  float,
  match_count      int,
  filter_user_id   uuid
)
returns table (
  id         uuid,
  content    text,
  metadata   jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.user_documents d
  where d.user_id = filter_user_id
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;
