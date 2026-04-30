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
NOTIFY pgrst, 'reload schema';
`;

async function runSQL() {
  try {
    const response2 = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (!response2.ok) {
      const text = await response2.text();
      console.error('❌ Could not run SQL via pg endpoint:', text);
      return;
    }

    const data2 = await response2.json();
    console.log('✅ Success reloading schema cache via pg endpoint');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runSQL();
