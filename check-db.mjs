import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Manual env parsing
const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith("'") || value.startsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking database connection to:', supabaseUrl);
  
  const { data: tables, error: tableError } = await supabase
    .from('conversations')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('Error querying conversations table:', tableError.message);
  } else {
    console.log('Table "conversations" exists. Row count (limit 1):', tables.length);
  }
}

check();
