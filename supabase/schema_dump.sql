-- Consolidated Schema Dump for Law-PH
-- Run this in your Supabase SQL Editor to set up the database

-- 1. Create conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations(user_id);
alter table public.conversations enable row level security;

-- 2. Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  "imagePreview" text,
  "timestamp" timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
alter table public.messages enable row level security;

-- 3. RLS Policies
-- Drop existing to ensure clean slate
drop policy if exists "Users can read own conversations" on public.conversations;
drop policy if exists "Users can create conversations" on public.conversations;
drop policy if exists "Users can update own conversations" on public.conversations;
drop policy if exists "Users can delete own conversations" on public.conversations;
drop policy if exists "Users can insert own conversations" on public.conversations;

-- Conversations Policies
create policy "Users can read own conversations" on public.conversations for select using (auth.uid() = user_id);
create policy "Users can update own conversations" on public.conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own conversations" on public.conversations for delete using (auth.uid() = user_id);
create policy "Users can insert own conversations" on public.conversations for insert with check (auth.uid() = user_id);

-- Messages Policies
drop policy if exists "Users can read messages from own conversations" on public.messages;
drop policy if exists "Users can create messages in own conversations" on public.messages;
drop policy if exists "Users can update messages from own conversations" on public.messages;
drop policy if exists "Users can delete messages from own conversations" on public.messages;
drop policy if exists "Users can manage messages from own conversations" on public.messages;

create policy "Users can manage messages from own conversations" on public.messages for all using (
  exists (
    select 1 from public.conversations
    where id = messages.conversation_id
    and user_id = auth.uid()
  )
);

-- 4. Helper API Functions
create or replace function delete_conversation(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversations 
    where id = target_id 
    and user_id = auth.uid()
  ) then
    raise exception 'Access denied: You do not own this conversation.';
  end if;
  delete from public.conversations where id = target_id;
end;
$$;
