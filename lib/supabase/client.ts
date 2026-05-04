import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<any, "law_ph"> | null = null;

export function createClient(): SupabaseClient<any, "law_ph"> {
  if (client) return client;

  const newClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'law_ph' }
    }
  ) as SupabaseClient<any, "law_ph">;

  client = newClient;
  return newClient;
}

