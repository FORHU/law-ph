-- FIX: Force-repair the UPDATE policy for conversations
-- This script explicitly drops the old policy and creates a new, permissive one for the owner.

-- 1. Drop existing update policies to clear conflicts
drop policy if exists "Users can update own conversations" on public.conversations;
drop policy if exists "Users can update their own conversations" on public.conversations;

-- 2. Create the correct policy
-- "USING" determines which rows you can see/target (must be your own)
-- "WITH CHECK" determines if the *new* data is valid (must still be your own)
create policy "Users can update own conversations"
on public.conversations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 3. Verify it's enabled
alter table public.conversations enable row level security;
