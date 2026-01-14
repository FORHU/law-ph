-- Create messages table in public schema
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  role text not null
    check (role in ('user', 'assistant')),

  content text not null,

  created_at timestamptz not null default now()
);

-- Index for faster message lookup per conversation
create index if not exists messages_conversation_id_idx
on public.messages(conversation_id);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- Allow users to read messages from their own conversations
create policy "Users can read messages from own conversations"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

-- Allow users to insert messages into their own conversations
create policy "Users can create messages in own conversations"
on public.messages
for insert
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);
