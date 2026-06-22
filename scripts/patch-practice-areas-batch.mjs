/**
 * Submit an OpenAI Batch API job to classify practice_areas for unclassified documents.
 *
 * Prerequisites:
 *   1. Run patch-practice-areas-setup.sql  (adds the column)
 *   2. Run patch-practice-areas-rules.sql  (seeds obvious ones by bucket_slug)
 *   3. Set OPENAI_API_KEY in .env.local
 *
 * Usage:
 *   node scripts/patch-practice-areas-batch.mjs
 *   node scripts/patch-practice-areas-batch.mjs --dry-run   (preview first 5 rows, no API calls)
 *   node scripts/patch-practice-areas-batch.mjs --limit 100 (test with 100 docs first)
 *
 * Outputs:
 *   batch_state.json  — saved to project root; needed by patch-practice-areas-apply.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));

const RAG_DB_URL = process.env.RAG_DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null;
const STATE_FILE = path.join(__dirname, '..', 'batch_state.json');

const TAXONOMY = [
  'labor_law', 'tax_law', 'criminal_law', 'civil_law',
  'commercial_law', 'property_law', 'family_law',
  'constitutional_law', 'administrative_law', 'local_government_law',
  'environmental_law', 'intellectual_property', 'immigration_law',
  'social_welfare_law', 'banking_law', 'election_law',
].join(', ');

const SYSTEM_PROMPT = `You are a Philippine legal document classifier.
Given a document title, summary, and source bucket, output ONLY a JSON array of practice areas.
Choose from this exact list: ${TAXONOMY}.
Rules:
- Return 1 to 3 items maximum
- Use only labels from the list above — never invent new labels
- If truly unclear, return ["administrative_law"]
Example output: ["labor_law","civil_law"]`;

function buildUserMessage(doc) {
  return `Title: ${doc.title ?? '(no title)'}
Summary: ${doc.summary ?? '(no summary)'}
Source bucket: ${doc.bucket_slug}`;
}

async function main() {
  if (!RAG_DB_URL) { console.error('ERROR: RAG_DATABASE_URL not set'); process.exit(1); }
  if (!DRY_RUN && !OPENAI_API_KEY) { console.error('ERROR: OPENAI_API_KEY not set'); process.exit(1); }

  const pool = new pg.Pool({ connectionString: RAG_DB_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : '';
  const { rows: docs } = await client.query(`
    SELECT id, title, summary, bucket_slug
    FROM documents
    WHERE practice_areas = '{}'
    ORDER BY id
    ${limitClause}
  `);
  client.release();
  await pool.end();

  console.log(`Found ${docs.length} unclassified documents`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: first 5 inputs ---');
    docs.slice(0, 5).forEach(doc => {
      console.log(`\n[doc-${doc.id}]\n${buildUserMessage(doc)}`);
    });
    return;
  }

  // Build JSONL content
  const lines = docs.map(doc => JSON.stringify({
    custom_id: `doc-${doc.id}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: 'gpt-4o-mini',
      max_tokens: 60,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(doc) },
      ],
    },
  }));

  const jsonlContent = lines.join('\n');
  console.log(`JSONL size: ${(Buffer.byteLength(jsonlContent) / 1024 / 1024).toFixed(2)} MB`);

  // Upload file to OpenAI
  console.log('Uploading batch input file...');
  const formData = new FormData();
  formData.append('purpose', 'batch');
  formData.append('file', new Blob([jsonlContent], { type: 'application/jsonl' }), 'batch_input.jsonl');

  const uploadRes = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('Upload failed:', err);
    process.exit(1);
  }

  const uploadedFile = await uploadRes.json();
  console.log('File uploaded:', uploadedFile.id);

  // Create the batch job
  const batchRes = await fetch('https://api.openai.com/v1/batches', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input_file_id: uploadedFile.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    }),
  });

  if (!batchRes.ok) {
    const err = await batchRes.text();
    console.error('Batch creation failed:', err);
    process.exit(1);
  }

  const batch = await batchRes.json();
  console.log(`\nBatch created!`);
  console.log(`  Batch ID:  ${batch.id}`);
  console.log(`  Status:    ${batch.status}`);
  console.log(`  Requests:  ${docs.length}`);

  // Save state for the apply script
  fs.writeFileSync(STATE_FILE, JSON.stringify({ batch_id: batch.id, doc_count: docs.length, created_at: new Date().toISOString() }, null, 2));
  console.log(`\nState saved to batch_state.json`);
  console.log(`Run patch-practice-areas-apply.mjs once the batch completes (usually within a few hours).`);
  console.log(`Check status: https://platform.openai.com/batches/${batch.id}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
