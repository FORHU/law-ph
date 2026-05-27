import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';

export async function POST(req: Request) {
  try {
    const { to, subject, body, type, eventDetails, organizer, timezone: deviceTimezone } = await req.json();

    if (!to || (!body && !eventDetails)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const timezone = deviceTimezone || 'UTC';

    const host = req.headers.get('host');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || (host ? `${protocol}://${host}` : 'http://localhost:3000');

    // Google OAuth tokens are not available without provider OAuth implementation
    const googleAccessToken = undefined;
    const googleRefreshToken = undefined;

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
