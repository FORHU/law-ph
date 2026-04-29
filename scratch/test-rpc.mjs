import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function tryExec(sql) {
    console.log(`Trying to execute SQL: ${sql.substring(0, 50)}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error("RPC failed:", error.message);
        return false;
    }
    console.log("RPC success!");
    return true;
}

const migrations = [
    `create table if not exists public.conversations (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        title text not null,
        created_at timestamptz not null default now()
    );`,
    `create table if not exists public.transcriptions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        title text not null default 'Untitled Transcription',
        audio_url text,
        transcript text,
        duration integer default 0,
        job_name text,
        created_at timestamptz not null default now()
    );`,
    `create table if not exists public.cases (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        title text not null,
        client text,
        case_number text,
        status text default 'active',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
    );`
];

async function run() {
    for (const sql of migrations) {
        await tryExec(sql);
    }
}

run();
