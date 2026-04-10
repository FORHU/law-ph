import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.provider_token) {
      return NextResponse.json({ error: 'Unauthorized or missing Google token' }, { status: 401 });
    }

    const body = await req.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Missing webhookUrl. In development, use an ngrok URL forwarding to /api/webhooks/calendar.' }, { status: 400 });
    }

    const channelId = uuidv4();

    // Register watch with Google Calendar
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.provider_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Watch API error:', errorData);
      return NextResponse.json({ error: 'Failed to create watch channel', details: errorData }, { status: response.status });
    }

    const watchData = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Successfully registered calendar webhook watch.',
      watchData,
      channelId
    });

  } catch (error) {
    console.error('Watch API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
