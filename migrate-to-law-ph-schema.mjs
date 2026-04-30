import { readFileSync } from 'fs';

// Manual env parsing
const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/) ;
  if (match) {
    let value = (match[2] || '').trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to:', supabaseUrl);

const sql = `
-- 1. Create the law_ph schema
CREATE SCHEMA IF NOT EXISTS law_ph;

-- 2. Move all tables from public to law_ph
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
  LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' SET SCHEMA law_ph';
  END LOOP;
END $$;

-- 3. Move custom types/enums from public to law_ph
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT n.nspname as schema, t.typname as name
    FROM pg_type t
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' 
    AND (t.typtype = 'e' OR t.typtype = 'c') -- enum or composite
  ) 
  LOOP
    EXECUTE 'ALTER TYPE public.' || quote_ident(r.name) || ' SET SCHEMA law_ph';
  END LOOP;
END $$;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration to law_ph schema completed!' as result;
`;

async function runSQL() {
  try {
    const response = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Could not run SQL via pg endpoint:', text);
      return;
    }

    const data = await response.json();
    console.log('✅ Live Database migrated to law_ph schema!', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runSQL();
