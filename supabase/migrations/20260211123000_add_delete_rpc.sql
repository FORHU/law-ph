-- Create a secure deletion function that bypasses RLS
create or replace function delete_conversation(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public -- Secure search path
as $$
begin
  -- Validate that the user owns the conversation (Double check for safety)
  if not exists (
    select 1 from public.conversations 
    where id = target_id 
    and user_id = auth.uid()
  ) then
    raise exception 'Access denied: You do not own this conversation.';
  end if;

  -- Perform the deletion
  delete from public.conversations where id = target_id;
end;
$$;
