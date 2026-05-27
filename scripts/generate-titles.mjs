/**
 * Generates titles for untitled documents in legalrag using ChatWonder.
 *
 * Setup:
 *   1. Make sure Docker is running with the lawph-postgres container
 *   2. Make sure .env.local has RAG_DATABASE_URL and CHAT_WONDER_API_URL set
 *   3. Run: node scripts/generate-titles.mjs
 *
 * What it does:
 *   - Finds all documents in legalrag with no title
 *   - Sends each document's summary/text to ChatWonder to generate a short title
 *   - Saves the title back to the database
 *   - Processes 5 documents at a time for speed
 */

import { WebSocket } from 'ws';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.local ────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env.local not found. Make sure you are running from the project root.');
  process.exit(1);
}

for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
}

// ── Config ─────────────────────────────────────────────────────────────────
const CHAT_WONDER_URL = (process.env.CHAT_WONDER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const WS_URL = CHAT_WONDER_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/chat-stream';
const RAG_DB_URL = process.env.RAG_DATABASE_URL;
const BATCH_SIZE = 5;
const DELAY_MS = 1000;
const TIMEOUT_MS = 30000;

if (!RAG_DB_URL) {
  console.error('ERROR: RAG_DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: RAG_DB_URL });

// ── Get ChatWonder session ─────────────────────────────────────────────────
async function getSession() {
  const res = await fetch(`${CHAT_WONDER_URL}/session-id`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.session_id;
}

// ── Strip dates from generated title ──────────────────────────────────────
function stripDates(title) {
  return title
    .replace(/,?\s*\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\b/gi, '')
    .replace(/,?\s*\b\d{4}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Generate title via ChatWonder WebSocket ────────────────────────────────
async function generateTitle(sessionId, document) {
  const context = (document.concise_summary || document.full_text || '').trim();
  if (!context) return null;

  const prompt = `You are a legal document classifier for Philippine law.
Based on this document excerpt, generate a short professional title (5-12 words).
Rules: no quotes, no dates, no years, no numbers, no punctuation at the end.

Document:
${context.slice(0, 600)}

Respond with ONLY the title.`;

  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let result = '';
    const timeout = setTimeout(() => { ws.close(); resolve(null); }, TIMEOUT_MS);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'chat', user_input: prompt, session_id: sessionId }));
    });

    ws.on('message', (data) => {
      const msg = data.toString();
      if (msg === '__END__') {
        clearTimeout(timeout);
        ws.close();
        const title = stripDates(result.trim().replace(/^["']|["']$/g, '')).slice(0, 150);
        resolve(title || null);
      } else if (!msg.startsWith('[Error]') && !msg.startsWith('[Tool]') && !msg.startsWith('[Sources]')) {
        result += msg;
      }
    });

    ws.on('error', () => { clearTimeout(timeout); resolve(null); });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (result.trim()) {
        const title = stripDates(result.trim().replace(/^["']|["']$/g, '')).slice(0, 150);
        resolve(title || null);
      }
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to legalrag database...');

  const { rows: docs } = await pool.query(`
    SELECT id, concise_summary, LEFT(full_text, 600) as full_text
    FROM documents
    WHERE (title IS NULL OR title = '')
    ORDER BY id
  `);

  if (docs.length === 0) {
    console.log('All documents already have titles. Nothing to do.');
    await pool.end();
    return;
  }

  console.log(`Found ${docs.length} untitled documents.`);
  console.log(`ChatWonder: ${CHAT_WONDER_URL}`);
  console.log('Getting session...');

  let sessionId;
  try {
    sessionId = await getSession();
    console.log(`Session: ${sessionId}\n`);
  } catch (e) {
    console.error(`ERROR: Could not connect to ChatWonder at ${CHAT_WONDER_URL}`);
    console.error('Make sure CHAT_WONDER_API_URL is set correctly in .env.local and the server is running.');
    await pool.end();
    return;
  }

  let success = 0;
  let failed = 0;
  const totalBatches = Math.ceil(docs.length / BATCH_SIZE);

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`Batch ${batchNum}/${totalBatches} (docs ${i + 1}–${Math.min(i + BATCH_SIZE, docs.length)})...`);

    await Promise.all(batch.map(async (doc) => {
      const title = await generateTitle(sessionId, doc);
      if (title) {
        await pool.query('UPDATE documents SET title = $1 WHERE id = $2', [title, doc.id]);
        console.log(`  ✓ [${doc.id}] ${title}`);
        success++;
      } else {
        console.log(`  ✗ [${doc.id}] Failed — no content or ChatWonder timeout`);
        failed++;
      }
    }));

    if (i + BATCH_SIZE < docs.length) await sleep(DELAY_MS);
  }

  console.log(`\n─────────────────────────────`);
  console.log(`Done. ${success} titles generated, ${failed} failed.`);
  if (failed > 0) console.log(`Re-run the script to retry failed documents.`);
  await pool.end();
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
