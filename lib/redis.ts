/**
 * ioredis client — shared singleton.
 *
 * Connects to REDIS_URL (defaults to localhost:6379 for local Docker).
 * If Redis is unreachable every call is a no-op — the route falls back
 * to its in-process LRU cache automatically.
 */
import Redis from 'ioredis';

let _client: Redis | null = null;

function getClient(): Redis | null {
  if (_client) return _client;
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  try {
    _client = new Redis(url, {
      maxRetriesPerRequest: 0,      // fail immediately — don't retry
      connectTimeout: 1500,
      enableOfflineQueue: false,    // reject commands instantly when not connected
      lazyConnect: true,
    });
    _client.on('error', () => {
      // Silence connection errors — cache is best-effort
    });
    return _client;
  } catch {
    return null;
  }
}

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getClient();
      if (!client) return null;
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      const client = getClient();
      if (!client) return;
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // never crash the route on a cache write failure
    }
  },
};
