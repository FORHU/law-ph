import { Pool } from "pg";

const globalForRag = globalThis as unknown as { ragPool: Pool | undefined };

export const ragPool =
  globalForRag.ragPool ??
  new Pool({ connectionString: process.env.RAG_DATABASE_URL! });

if (process.env.NODE_ENV !== "production") globalForRag.ragPool = ragPool;

export default ragPool;
