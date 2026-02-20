-- Create cases table
create table cases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  case_name text not null,
  party_involved text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table cases enable row level security;

-- Create policies
create policy "Users can insert their own cases"
  on cases for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own cases"
  on cases for select
  using (auth.uid() = user_id);

create policy "Users can update their own cases"
  on cases for update
  using (auth.uid() = user_id);

create policy "Users can delete their own cases"
  on cases for delete
  using (auth.uid() = user_id);
