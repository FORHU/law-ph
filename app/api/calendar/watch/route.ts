import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const providerToken = session?.provider_token || session?.user?.user_metadata?.provider_token;

    if (!session || !providerToken) {
      return NextResponse.json({ error: 'Unauthorized or missing Google token' }, { status: 401 });
    }

    const body = await req.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Missing webhookUrl. In development, use an ngrok URL forwarding to /api/webhooks/calendar.' },
        { status: 400 }
      );
    }

    const channelId = crypto.randomUUID();

    // Register watch with Google Calendar
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Watch API error:', errorData);
      return NextResponse.json({ error: 'Failed to create watch channel', details: errorData }, { status: response.status });
    }

    const watchData = await response.json();

    // Persist the channel so the webhook handler can look up which user it belongs to.
    // Use service-role client to bypass RLS on calendar_watch_channels.
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Remove any previous channels for this user before inserting the new one
    await adminClient
      .from('calendar_watch_channels')
      .delete()
      .eq('user_id', session.user.id);

    const { error: insertError } = await adminClient
      .from('calendar_watch_channels')
      .insert({
        channel_id: channelId,
        resource_id: watchData.resourceId ?? null,
        user_id: session.user.id,
        expiration: watchData.expiration ? Number(watchData.expiration) : null,
      });

    if (insertError) {
      console.error('Failed to save watch channel to DB:', insertError.message);
      // Don't fail the request — the watch is registered with Google; DB row is best-effort
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully registered calendar webhook watch.',
      watchData,
      channelId,
    });

  } catch (error) {
    console.error('Watch API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
