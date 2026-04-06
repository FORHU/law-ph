-- Drop the existing role check constraint that restricts roles to 'user' or 'assistant'
alter table public.messages drop constraint if exists messages_role_check;

-- Add it back including the 'system' role
alter table public.messages add constraint messages_role_check check (role in ('user', 'assistant', 'system'));
