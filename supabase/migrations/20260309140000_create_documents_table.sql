create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  case_id uuid references public.cases(id) on delete set null,
  file_url text,
  s3_key text,
  ai_summary text,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents(user_id);

alter table public.documents enable row level security;

create policy "Users can manage own documents" on public.documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
