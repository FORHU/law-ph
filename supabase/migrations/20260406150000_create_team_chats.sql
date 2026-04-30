-- Create case/conversation invites table
create table law_ph.conversation_invites (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references law_ph.conversations(id) on delete cascade unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Index for speedy lookup by ID
create index if not exists conversation_invites_id_idx on law_ph.conversation_invites(id);

-- Create participants table
create table law_ph.conversation_participants (
  conversation_id uuid not null references law_ph.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Enable RLS
alter table law_ph.conversation_invites enable row level security;
alter table law_ph.conversation_participants enable row level security;

-- Policies for invites
create policy "Users can view invites they created"
on law_ph.conversation_invites for select
using (auth.uid() = created_by);

create policy "Invites are readable by anyone"
on law_ph.conversation_invites for select
using (true);

create policy "Users can insert invites for their conversations"
on law_ph.conversation_invites for insert
with check (
  exists (
    select 1 from law_ph.conversations
    where id = conversation_id and user_id = auth.uid()
  )
);

-- Policies for participants
create policy "Users can view participants"
on law_ph.conversation_participants for select
using (true);

create policy "Users can join via invite"
on law_ph.conversation_participants for insert
with check (
  auth.uid() = user_id
);

-- Update Conversations RLS
drop policy if exists "Users can read own conversations" on law_ph.conversations;
drop policy if exists "Users can update own conversations" on law_ph.conversations;
drop policy if exists "Users can delete own conversations" on law_ph.conversations;

create policy "Users can read own conversations or ones they joined"
on law_ph.conversations for select
using (
  auth.uid() = user_id 
  or exists (
    select 1 from law_ph.conversation_participants cp 
    where cp.conversation_id = id and cp.user_id = auth.uid()
  )
);

create policy "Users can update own conversations or ones they joined"
on law_ph.conversations for update
using (
  auth.uid() = user_id 
  or exists (
    select 1 from law_ph.conversation_participants cp 
    where cp.conversation_id = id and cp.user_id = auth.uid()
  )
);

create policy "Users can delete own conversations"
on law_ph.conversations for delete
using (auth.uid() = user_id);

-- Update Cases RLS
drop policy if exists "Users can view their own cases" on law_ph.cases;
drop policy if exists "Users can update their own cases" on law_ph.cases;
drop policy if exists "Users can delete their own cases" on law_ph.cases;

create policy "Users can view their own cases or ones they joined"
on law_ph.cases for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from law_ph.conversation_participants cp 
    where cp.conversation_id = id and cp.user_id = auth.uid()
  )
);

create policy "Users can update their own cases or ones they joined"
on law_ph.cases for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from law_ph.conversation_participants cp 
    where cp.conversation_id = id and cp.user_id = auth.uid()
  )
);

create policy "Users can delete their own cases"
on law_ph.cases for delete
using (auth.uid() = user_id);

-- Update Messages RLS
drop policy if exists "Users can manage messages from own conversations" on law_ph.messages;

create policy "Users can manage messages from own conversations or joined ones"
on law_ph.messages for all
using (
  exists (
    select 1 from law_ph.conversations c
    where c.id = messages.conversation_id
    and (
      c.user_id = auth.uid()
      or exists (
        select 1 from law_ph.conversation_participants cp 
        where cp.conversation_id = c.id and cp.user_id = auth.uid()
      )
    )
  )
);
