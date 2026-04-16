import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { refreshGoogleAccessToken } from '@/lib/google-token';

// Infer event type from title / description text
function inferEventType(title?: string, description?: string): string {
  const text = `${title ?? ''} ${description ?? ''}`.toLowerCase();
  if (text.includes('hearing')) return 'hearing';
  if (text.includes('deposition')) return 'deposition';
  if (text.includes('appointment')) return 'appointment';
  return 'meeting';
}

// Helper to map google event status based on attendee responses
function getEventStatus(e: any): string {
  if (e.status === 'cancelled') return 'cancelled';
  
  if (e.attendees && Array.isArray(e.attendees)) {
    // Filter out the organizer
    const guests = e.attendees.filter((a: any) => !a.organizer);
    if (guests.length > 0) {
      const allDeclined = guests.every((a: any) => a.responseStatus === 'declined');
      if (allDeclined) return 'rejected';
      
      const anyAccepted = guests.some((a: any) => a.responseStatus === 'accepted');
      if (anyAccepted) return 'confirmed';

      return 'pending'; // Needs action
    }
  }
  return 'confirmed';
}

export async function POST(req: Request) {
  // Service-role client: bypasses RLS so the webhook can read channel mappings
  // and upsert events for any user.
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');

    console.log(`[Calendar Webhook] state=${resourceState} channel=${channelId}`);

    // Google sends a "sync" ping when the watch is first registered — just acknowledge it.
    if (resourceState === 'sync') {
      return new Response('Sync acknowledged', { status: 200 });
    }

    // Only process "exists" state (a real change happened)
    if (resourceState !== 'exists' || !channelId) {
      return new Response('Ignored', { status: 200 });
    }

    // 1. Look up which user owns this channel
    const { data: channel, error: channelError } = await adminClient
      .from('calendar_watch_channels')
      .select('user_id')
      .eq('channel_id', channelId)
      .single();

    if (channelError || !channel) {
      console.error('[Calendar Webhook] Unknown channel:', channelId);
      return new Response('Unknown channel', { status: 200 }); // 200 so Google stops retrying
    }

    const userId = channel.user_id;

    // 2. Fetch the user's stored refresh token from their metadata
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error('[Calendar Webhook] User not found:', userId);
      return new Response('User not found', { status: 200 });
    }

    const refreshToken = user.user_metadata?.provider_refresh_token;

    if (!refreshToken) {
      console.error('[Calendar Webhook] No refresh token for user:', userId);
      return new Response('No refresh token', { status: 200 });
    }

    // 3. Get a fresh access token
    const accessToken = await refreshGoogleAccessToken(refreshToken);

    if (!accessToken) {
      console.error('[Calendar Webhook] Token refresh failed for user:', userId);
      return new Response('Token refresh failed', { status: 200 });
    }

    // 4. Fetch upcoming events from Google Calendar
    const now = new Date().toISOString();
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', now);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');

    const googleRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok) {
      const err = await googleRes.text();
      console.error('[Calendar Webhook] Google Calendar fetch failed:', err);
      return new Response('Google fetch failed', { status: 200 });
    }

    const googleData = await googleRes.json();
    const googleEvents: any[] = googleData.items ?? [];

    if (googleEvents.length === 0) {
      return new Response('No events to sync', { status: 200 });
    }

    // 5. Upsert each event into the Supabase events table.
    //    We use google_event_id as the unique key to avoid duplicates.
    const rows = googleEvents
      .filter((e: any) => e.status !== 'cancelled')
      .map((e: any) => ({
        user_id: userId,
        google_event_id: e.id,
        title: e.summary ?? 'Untitled',
        type: inferEventType(e.summary, e.description),
        date_time: e.start?.dateTime ?? e.start?.date ?? now,
        notes: e.description ?? null,
        google_link: e.htmlLink ?? null,
        status: getEventStatus(e),
      }));

    if (rows.length > 0) {
      const { error: upsertError } = await adminClient
        .from('events')
        .upsert(rows, { onConflict: 'google_event_id,user_id', ignoreDuplicates: false });

      if (upsertError) {
        console.error('[Calendar Webhook] Upsert error:', upsertError.message);
        return new Response('DB upsert failed', { status: 500 });
      }

      console.log(`[Calendar Webhook] Synced ${rows.length} events for user ${userId}`);
    }

    // 6. Delete any events that were cancelled in Google
    const cancelledIds = googleEvents
      .filter((e: any) => e.status === 'cancelled')
      .map((e: any) => e.id);

    if (cancelledIds.length > 0) {
      await adminClient
        .from('events')
        .delete()
        .eq('user_id', userId)
        .in('google_event_id', cancelledIds);
    }

    return new Response('Synced', { status: 200 });

  } catch (error) {
    console.error('[Calendar Webhook] Unexpected error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
