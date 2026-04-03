import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email-service';

// Initialize a public-only Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;

  // Robust Site URL detection for fallbacks
  const host = req.headers.get('host') || 'localhost:3000';
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || `${protocol}://${host}`;

  try {
    // 1. Fetch Event Details
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      return NextResponse.redirect(new URL(`/confirm/${eventId}?error=not_found`, siteUrl));
    }

    // 2. Update status in Supabase if not already confirmed
    if (event.status !== 'confirmed') {
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: 'confirmed' })
        .eq('id', eventId);

      if (updateError) throw updateError;

      // 3. Trigger Success Email (Directly via service)
      sendEmail({
        to: event.client_email,
        type: 'confirmation_success',
        eventDetails: {
          eventId: event.id,
          eventType: event.title,
          dateTime: event.date_time,
          notes: event.notes
        },
        siteUrl
      }).catch(e => console.error("Error sending background success email:", e));
    }

    // 4. Redirect DIRECTLY to Google Calendar "Save" screen
    const startDate = new Date(event.date_time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1hr
    const formatG = (d: Date) => d.toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '');
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatG(startDate)}/${formatG(endDate)}&details=${encodeURIComponent(event.notes || '')}`;

    return NextResponse.redirect(gCalUrl);

  } catch (err: any) {
    console.error('Confirm API Error:', err);
    // On hard failure, fall back to the web landing page
    return NextResponse.redirect(new URL(`/confirm/${eventId}?error=api_failure`, siteUrl));
  }
}
