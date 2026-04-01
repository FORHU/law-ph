import { NextResponse } from 'next/server';
import { resend } from '@/lib/resend';

export async function POST(req: Request) {
  try {
    const { to, subject, body, type, eventDetails } = await req.json();

    if (!to || (!body && !eventDetails)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(to) ? to : [to];
    const cleanRecipients = recipients.map(r => r.replace(/\s+/g, '.').toLowerCase());

    let emailContent = body;
    let emailSubject = subject;
    let attachments: any[] = [];

    if (type === 'schedule' && eventDetails) {
      const { eventId, eventType, dateTime, notes } = eventDetails;
      emailSubject = `Action Required: Confirm your ${eventType}`;

      const startDate = new Date(dateTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      
      // Improved Host Detection
      const host = req.headers.get('host');
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000');
      
      const confirmUrl = `${siteUrl}/confirm/${eventId}`;

      const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '');
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventType)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent(notes || '')}`;

      // Gmail JSON-LD for "Confirm" action button
      const jsonLd = {
        "@context": "http://schema.org",
        "@type": "EventReservation",
        "reservationNumber": eventId,
        "reservationStatus": "http://schema.org/Confirmed",
        "underName": {
          "@type": "Person",
          "name": cleanRecipients[0].split('@')[0] // Use first recipient for primary metadata
        },
        "reservationFor": {
          "@type": "Event",
          "name": eventType,
          "startDate": startDate.toISOString(),
          "location": {
            "@type": "Place",
            "name": "Law PH Consultation",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Online / Office",
              "addressLocality": "Manila",
              "addressRegion": "NCR",
              "postalCode": "1000",
              "addressCountry": "PH"
            }
          }
        }
      };

      // Create an ICS file string with multiple attendees
      const uid = `${eventId}@ilovelawyer.com`;
      const attendeeRows = cleanRecipients.map(email => 
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${email}:mailto:${email}`
      ).join('\r\n');

      const icsString = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'PRODID:-//ilovelawyer//EN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatGoogleDate(new Date())}Z`,
        `DTSTART:${formatGoogleDate(startDate)}Z`,
        `DTEND:${formatGoogleDate(endDate)}Z`,
        `SUMMARY:${eventType}`,
        `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`,
        'ORGANIZER;CN=ilovelawyer:mailto:updates@ilovelawyer.com',
        attendeeRows,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      attachments = [{
        filename: 'invite.ics',
        content: Buffer.from(icsString),
        contentType: 'text/calendar; method=REQUEST'
      }];

      emailContent = `
        <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <tr>
                  <td style="background-color: #8B4564; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Confirm Your Appointment</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 25px;">Hello,</p>
                    <p style="font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 25px;">A new appointment has been scheduled for you. Please confirm your attendance below.</p>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding-bottom: 10px;"><strong>Event:</strong></td>
                        <td style="padding-bottom: 10px; color: #8B4564;">${eventType}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;"><strong>Date & Time:</strong></td>
                        <td style="padding-bottom: 10px;">${startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;"><strong>Attendees:</strong></td>
                        <td style="padding-bottom: 10px;">${cleanRecipients.join(', ')}</td>
                      </tr>
                      <tr>
                        <td><strong>Notes:</strong></td>
                        <td>${notes || 'No notes provided.'}</td>
                      </tr>
                    </table>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${confirmUrl}" style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
                            ✅ Confirm Appointment
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="${googleCalendarUrl}" target="_blank" style="color: #8B4564; text-decoration: underline; font-size: 14px;">
                            Add to My Google Calendar
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9f9f9; padding: 20px; text-align: center; color: #999999; font-size: 12px;">
                    This is an automated message from ILoveLawyer. Please use the buttons above to respond.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    }

    // Simple robust Markdown to Email HTML
    const markdownToHtml = (md: string) => {
      let html = md
        // Headers
        .replace(/^### (.*$)/gim, '<h3 style="margin-top: 20px; margin-bottom: 8px; color: #1f2937; font-size: 16px;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="margin-top: 24px; margin-bottom: 12px; color: #111827; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="margin-top: 28px; margin-bottom: 16px; color: #000000; font-size: 24px;">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Italics
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // List Items
        .replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px;">$1</li>');

      // Wrap consecutive <li> into <ul>
      html = html.replace(/(<li.*?>.*?<\/li>\n*)+/g, '<ul style="margin-top: 8px; margin-bottom: 16px; padding-left: 20px;">$&</ul>');

      // Split by double newlines to create paragraphs
      const blocks = html.split(/\n\n+/);
      html = blocks.map(block => {
        // Don't wrap if it's already a block element like h1, h2, h3, or ul
        if (block.trim().match(/^(<h|<ul|<li)/i)) {
          return block;
        }
        return `<p style="margin-bottom: 16px; line-height: 1.6; color: #374151;">${block.replace(/\n/g, '<br/>')}</p>`;
      }).join('\n');

      return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 800px; padding: 20px; background: #ffffff;">${html}</div>`;
    };

    const formattedContent = type === 'schedule' ? emailContent : markdownToHtml(emailContent);

    const { data, error } = await resend.emails.send({
      from: 'ilovelawyer <updates@ilovelawyer.com>', // Verified domain
      to: cleanRecipients,
      subject: emailSubject || 'Update from Legal Consultation',
      html: formattedContent,
      ...(attachments.length > 0 && { attachments }),
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
