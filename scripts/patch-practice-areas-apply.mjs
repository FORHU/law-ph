/**
 * Download OpenAI Batch results and apply practice_areas to the RAG database.
 *
 * Prerequisites:
 *   - patch-practice-areas-batch.mjs must have run and created batch_state.json
 *
 * Usage:
 *   node scripts/patch-practice-areas-apply.mjs            (polls until done, then applies)
 *   node scripts/patch-practice-areas-apply.mjs --status   (check batch status only, no DB writes)
 *   node scripts/patch-practice-areas-apply.mjs --dry-run  (parse results but don't write to DB)
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
const STATE_FILE = path.join(__dirname, '..', 'batch_state.json');

const args = process.argv.slice(2);
const STATUS_ONLY = args.includes('--status');
const DRY_RUN = args.includes('--dry-run');

const VALID_LABELS = new Set([
  'labor_law', 'tax_law', 'criminal_law', 'civil_law',
  'commercial_law', 'property_law', 'family_law',
  'constitutional_law', 'administrative_law', 'local_government_law',
  'environmental_law', 'intellectual_property', 'immigration_law',
  'social_welfare_law', 'banking_law', 'election_law',
]);

function parseLabels(content) {
  try {
    const parsed = JSON.parse(content.trim());
    if (!Array.isArray(parsed)) return ['administrative_law'];
    const valid = parsed.filter(l => VALID_LABELS.has(l));
    return valid.length > 0 ? valid : ['administrative_law'];
  } catch {
    return ['administrative_law'];
  }
}

async function pollBatch(batchId) {
  while (true) {
    const res = await fetch(`https://api.openai.com/v1/batches/${batchId}`, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });
    const batch = await res.json();
    const { status, request_counts } = batch;

    console.log(`Status: ${status} | completed: ${request_counts?.completed ?? 0} / ${request_counts?.total ?? '?'} | failed: ${request_counts?.failed ?? 0}`);

    if (status === 'completed') return batch;
    if (['failed', 'expired', 'cancelled'].includes(status)) {
      console.error('Batch ended with status:', status);
      process.exit(1);
    }

    // Wait 2 minutes before checking again
    console.log('  Waiting 2 minutes...');
    await new Promise(r => setTimeout(r, 120_000));
  }
}

async function downloadResults(outputFileId) {
  const res = await fetch(`https://api.openai.com/v1/files/${outputFileId}/content`, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  });
  if (!res.ok) { console.error('Download failed:', await res.text()); process.exit(1); }
  return await res.text();
}

async function applyToDb(updates) {
  const pool = new pg.Pool({ connectionString: RAG_DB_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  let applied = 0;
  let skipped = 0;

  try {
    await client.query('BEGIN');

    for (const { docId, labels } of updates) {
      await client.query(
        `UPDATE documents SET practice_areas = $1 WHERE id = $2 AND practice_areas = '{}'`,
        [labels, docId]
      );
      applied++;
      if (applied % 5000 === 0) console.log(`  Applied ${applied} / ${updates.length}...`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  return { applied, skipped };
}

async function main() {
  if (!OPENAI_API_KEY) { console.error('ERROR: OPENAI_API_KEY not set'); process.exit(1); }
  if (!RAG_DB_URL && !STATUS_ONLY) { console.error('ERROR: RAG_DATABASE_URL not set'); process.exit(1); }

  if (!fs.existsSync(STATE_FILE)) {
    console.error('batch_state.json not found. Run patch-practice-areas-batch.mjs first.');
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  console.log(`Batch ID:   ${state.batch_id}`);
  console.log(`Submitted:  ${state.created_at}`);
  console.log(`Doc count:  ${state.doc_count}`);

  if (STATUS_ONLY) {
    const res = await fetch(`https://api.openai.com/v1/batches/${state.batch_id}`, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });
    const batch = await res.json();
    console.log('\nStatus:', batch.status);
    console.log('Counts:', batch.request_counts);
    return;
  }

  console.log('\nPolling batch status...');
  const completedBatch = await pollBatch(state.batch_id);
  console.log('Batch completed. Downloading results...');

  const rawResults = await downloadResults(completedBatch.output_file_id);
  const lines = rawResults.trim().split('\n').filter(Boolean);
  console.log(`Downloaded ${lines.length} result lines`);

  // Parse results
  const updates = [];
  let parseErrors = 0;

  for (const line of lines) {
    try {
      const result = JSON.parse(line);
      const docId = parseInt(result.custom_id.replace('doc-', ''), 10);
      const content = result.response?.body?.choices?.[0]?.message?.content ?? '[]';
      const labels = parseLabels(content);
      updates.push({ docId, labels });
    } catch {
      parseErrors++;
    }
  }

  console.log(`Parsed: ${updates.length} valid | ${parseErrors} parse errors`);

  // Preview sample
  console.log('\nSample results:');
  updates.slice(0, 5).forEach(u => console.log(`  doc-${u.docId} → ${JSON.stringify(u.labels)}`));

  if (DRY_RUN) {
    console.log('\n--dry-run: skipping DB writes.');
    return;
  }

  console.log(`\nWriting to database...`);
  const { applied } = await applyToDb(updates);
  console.log(`Done. Applied ${applied} practice_areas updates.`);

  // Final stats
  const pool = new pg.Pool({ connectionString: RAG_DB_URL, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(`
    SELECT practice_areas, COUNT(*) as count
    FROM documents
    WHERE practice_areas != '{}'
    GROUP BY practice_areas
    ORDER BY count DESC
    LIMIT 15
  `);
  await pool.end();

  console.log('\nTop classified buckets:');
  rows.forEach(r => console.log(`  ${JSON.stringify(r.practice_areas)}: ${r.count}`));
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
