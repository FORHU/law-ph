import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // We use the service role key to bypass RLS when handling webhooks.
  // Instantiated inside handler to avoid build-time env var resolution errors.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceId = req.headers.get('x-goog-resource-id');
    const resourceState = req.headers.get('x-goog-resource-state');

    console.log(`[Google Calendar Webhook] Received state: ${resourceState}, Channel ID: ${channelId}`);

    if (resourceState === 'sync') {
      return new Response('Sync successful', { status: 200 });
    }

    // In a full implementation, we'd look up the user's provider token 
    // using the channelId from our database, then fetch only changed events
    // using the sync_token. 
    // For MVP, we acknowledge the webhook and note that a sync needs to happen.

    // We could store the webhook event in an "audit_logs" or "processing_queue" table
    if (channelId && resourceState === 'exists') {
      console.log(`[Google Calendar Webhook] Change detected for channel ${channelId}. Background sync should fetch latest events.`);
      // Note: Supabase Edge Functions or a worker could process this queue asynchronously.
    }

    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
