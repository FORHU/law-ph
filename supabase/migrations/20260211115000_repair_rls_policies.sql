-- Drop existing policies to ensure a clean state
drop policy if exists "Users can read own conversations" on law_ph.conversations;
drop policy if exists "Users can create conversations" on law_ph.conversations;
drop policy if exists "Users can update own conversations" on law_ph.conversations;
drop policy if exists "Users can delete own conversations" on law_ph.conversations;

-- Re-enable RLS just in case
alter table law_ph.conversations enable row level security;

-- Re-create policies with explicit casting and simplified logic
create policy "Users can read own conversations"
on law_ph.conversations for select
using (auth.uid() = user_id);

create policy "Users can update own conversations"
on law_ph.conversations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own conversations"
on law_ph.conversations for delete
using (auth.uid() = user_id);

-- Add a redundant policy for INSERT to match the CREATE policy
create policy "Users can insert own conversations"
on law_ph.conversations for insert
with check (auth.uid() = user_id);

-- Do the same for messages
drop policy if exists "Users can read messages from own conversations" on law_ph.messages;
drop policy if exists "Users can create messages in own conversations" on law_ph.messages;
drop policy if exists "Users can update messages from own conversations" on law_ph.messages;
drop policy if exists "Users can delete messages from own conversations" on law_ph.messages;

alter table law_ph.messages enable row level security;

create policy "Users can manage messages from own conversations"
on law_ph.messages for all
using (
  exists (
    select 1 from law_ph.conversations
    where id = messages.conversation_id
    and user_id = auth.uid()
  )
);
