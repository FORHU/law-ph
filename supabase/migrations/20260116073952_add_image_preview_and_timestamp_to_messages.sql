alter table public.messages
add column if not exists "imagePreview" text;

-- Add timestamp column
alter table public.messages
add column if not exists "timestamp" timestamptz not null default now();