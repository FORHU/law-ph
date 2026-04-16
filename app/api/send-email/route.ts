import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { to, subject, body, type, eventDetails, organizer, timezone: deviceTimezone } = await req.json();

    if (!to || (!body && !eventDetails)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Default to UTC if not provided, but mostly rely on the device timezone injected by the client
    const timezone = deviceTimezone || 'UTC';

    // Robust Site URL detection
    const host = req.headers.get('host');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https');

    // Fallback chain: Env Var > Vercel Prod > Vercel URL > Current Host
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || (host ? `${protocol}://${host}` : 'http://localhost:3000');

    // Retrieve the user's Google OAuth tokens from the server-side session so
    // that emails are sent from their own Gmail account when possible.
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const googleAccessToken =
      session?.provider_token ??
      session?.user?.user_metadata?.provider_token ??
      undefined;
    const googleRefreshToken =
      session?.provider_refresh_token ??
      session?.user?.user_metadata?.provider_refresh_token ??
      undefined;

    const { data, error } = await sendEmail({
      to,
      subject,
      body,
      type,
      eventDetails,
      organizer,
      siteUrl,
      timezone,
      googleAccessToken,
      googleRefreshToken,
    });

    if (error) {
      console.error('Email Sending Error:', error);
      return NextResponse.json({ error: (error as any).message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
