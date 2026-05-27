import { Pool } from "pg";

const globalForRag = globalThis as unknown as { ragPool: Pool | undefined };

function createRagPool() {
  const url = process.env.RAG_DATABASE_URL;
  if (!url) {
    throw new Error("RAG_DATABASE_URL is not set");
  }
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  return new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

export const ragPool = globalForRag.ragPool ?? createRagPool();

if (process.env.NODE_ENV !== "production") globalForRag.ragPool = ragPool;

export default ragPool;
