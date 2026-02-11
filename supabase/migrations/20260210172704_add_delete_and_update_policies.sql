-- Add missing DELETE policy to conversations
create policy "Users can delete own conversations"
on public.conversations
for delete
using (auth.uid() = user_id);

-- Add missing UPDATE policy to conversations (for future feature support like renaming)
create policy "Users can update own conversations"
on public.conversations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
