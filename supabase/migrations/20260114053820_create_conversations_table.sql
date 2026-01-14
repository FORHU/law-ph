-- Create conversations table in public schema
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,

  created_at timestamptz not null default now()
);

-- Index for faster user lookups
create index if not exists conversations_user_id_idx
on public.conversations(user_id);

-- Enable Row Level Security
alter table public.conversations enable row level security;

-- Allow users to read their own conversations
create policy "Users can read own conversations"
on public.conversations
for select
using (auth.uid() = user_id);

-- Allow users to create their own conversations
create policy "Users can create conversations"
on public.conversations
for insert
with check (auth.uid() = user_id);
