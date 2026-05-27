import { Pool } from "pg";

const globalForRag = globalThis as unknown as { ragPool: Pool | undefined };

function createRagPool(): Pool {
  const url = process.env.RAG_DATABASE_URL;
  // During `next build`, RAG_DATABASE_URL is unavailable — return a placeholder
  // pool that is never queried. Real URL is injected at container runtime.
  const connectionString = url ?? "postgresql://placeholder@localhost/placeholder";
  const isLocal = !url || connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  return new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

export const ragPool = globalForRag.ragPool ?? createRagPool();

if (process.env.NODE_ENV !== "production") globalForRag.ragPool = ragPool;

export default ragPool;
