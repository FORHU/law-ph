/**
 * Batch-format legal library documents via Chat Wonder API.
 *
 * Prerequisites:
 *   - chat-wonder-v2-api running (CHAT_WONDER_API_URL)
 *   - .env with RAG_DATABASE_URL (optional, for listing ids)
 *
 * Usage:
 *   node scripts/format-documents.mjs --limit 20
 *   node scripts/format-documents.mjs --all
 *   node scripts/format-documents.mjs --id 150
 *   node scripts/format-documents.mjs --force --limit 5
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

const CHAT_WONDER_URL = (process.env.CHAT_WONDER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const RAG_DB_URL = process.env.RAG_DATABASE_URL;

const args = process.argv.slice(2);
const formatAll = args.includes('--all');
const limit = formatAll ? null : parseInt(args[args.indexOf('--limit') + 1] || '50', 10);
const singleId = args.includes('--id') ? parseInt(args[args.indexOf('--id') + 1], 10) : null;
const force = args.includes('--force');

async function formatDocument(id) {
  const url = `${CHAT_WONDER_URL}/api/legal/format-document/${id}${force ? '?force=true' : ''}`;
  const res = await fetch(url, { method: 'POST' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.detail || body.error || `HTTP ${res.status}`);
  }
  return body;
}

async function main() {
  let ids = [];

  if (singleId) {
    ids = [singleId];
  } else if (RAG_DB_URL) {
    const isLocal = RAG_DB_URL.includes('localhost') || RAG_DB_URL.includes('127.0.0.1');
    const pool = new pg.Pool({
      connectionString: RAG_DB_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
    const baseWhere = force
      ? `full_text IS NOT NULL AND length(trim(full_text)) > 100`
      : `formatted_markdown IS NULL
           AND full_text IS NOT NULL AND length(trim(full_text)) > 100`;
    const query = formatAll
      ? `SELECT id FROM documents WHERE ${baseWhere} ORDER BY id`
      : `SELECT id FROM documents WHERE ${baseWhere} ORDER BY id LIMIT $1`;
    const { rows } = await pool.query(query, formatAll ? [] : [limit]);
    await pool.end();
    ids = rows.map((r) => r.id);
  } else {
    console.error('Set RAG_DATABASE_URL or pass --id');
    process.exit(1);
  }

  if (!ids.length) {
    console.log('No documents to format.');
    return;
  }

  console.log(`Formatting ${ids.length} document(s) via ${CHAT_WONDER_URL}...`);
  let ok = 0;
  let failed = 0;

  for (const id of ids) {
    try {
      const result = await formatDocument(id);
      console.log(`  ✓ [${id}] ${result.cached ? 'cached' : 'formatted'} (${(result.formatted_markdown || '').length} chars)`);
      ok++;
    } catch (e) {
      console.log(`  ✗ [${id}] ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} ok, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
