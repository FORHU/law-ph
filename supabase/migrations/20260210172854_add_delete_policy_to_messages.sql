-- Add missing DELETE policy to messages
-- This is required for ON DELETE CASCADE to work correctly when a conversation is deleted
create policy "Users can delete messages from own conversations"
on public.messages
for delete
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

-- Add missing UPDATE policy to messages
create policy "Users can update messages from own conversations"
on public.messages
for update
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);
