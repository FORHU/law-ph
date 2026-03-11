-- Create bookmarks table
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  title text not null,
  reference text not null default '',
  type text not null default 'source' check (type in ('case', 'source')),
  url text,
  ai_summary text,
  doctrine text,
  facts text,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

-- Ensure columns exist if table was already created earlier
alter table public.bookmarks add column if not exists ai_summary text;
alter table public.bookmarks add column if not exists doctrine text;
alter table public.bookmarks add column if not exists facts text;

create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
alter table public.bookmarks enable row level security;

-- Drop existing policies if they exist (to allow re-running the script)
drop policy if exists "Users can read own bookmarks" on public.bookmarks;
drop policy if exists "Users can insert own bookmarks" on public.bookmarks;
drop policy if exists "Users can delete own bookmarks" on public.bookmarks;

-- RLS Policies
create policy "Users can read own bookmarks" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks" on public.bookmarks
  for delete using (auth.uid() = user_id);
