import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let modifiedCount = 0;

for (const file of files) {
  const filePath = join(migrationsDir, file);
  const content = readFileSync(filePath, 'utf-8');
  
  const newContent = content
    // Replace schema prefix public. -> law_ph.
    .replace(/public\./g, 'law_ph.')
    // Replace standalone string 'public' -> 'law_ph' when dealing with schemas
    .replace(/'public'/g, "'law_ph'")
    // Replace "public" -> "law_ph"
    .replace(/"public"/g, '"law_ph"');
    
  if (content !== newContent) {
    writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated ${file}`);
    modifiedCount++;
  }
}

console.log(`\n✅ Updated ${modifiedCount} migration files to use the law_ph schema.`);
