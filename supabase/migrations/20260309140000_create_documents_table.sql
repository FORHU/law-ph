create table if not exists law_ph.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  case_id uuid references law_ph.cases(id) on delete set null,
  file_url text,
  s3_key text,
  ai_summary text,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on law_ph.documents(user_id);

alter table law_ph.documents enable row level security;

create policy "Users can manage own documents" on law_ph.documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
