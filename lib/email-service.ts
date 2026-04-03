import { resend } from './resend';
import { Buffer } from 'buffer';

interface SendEmailParams {
  to: string | string[];
  subject?: string;
  body?: string;
  type?: 'schedule' | 'confirmation_success' | 'general';
  eventDetails?: {
    eventId: string;
    eventType: string;
    dateTime: string;
    notes?: string;
  };
  organizer?: {
    name: string;
    email: string;
  };
  siteUrl: string;
}

export async function sendEmail({
  to,
  subject,
  body,
  type,
  eventDetails,
  organizer,
  siteUrl
}: SendEmailParams) {
  const recipients = Array.isArray(to) ? to : [to];
  const cleanRecipients = recipients.map(r => r.replace(/\s+/g, '.').toLowerCase());

  let emailContent = body || '';
  let emailSubject = subject || 'Update from Legal Consultation';
  let attachments: any[] = [];

  if (type === 'schedule' && eventDetails) {
    const { eventId, eventType, dateTime, notes } = eventDetails;
    emailSubject = 'Scheduled Appointment';

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatG = (d: Date) => d.toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '');

    const uid = `${eventId}@ilovelawyer.com`;
    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=TRUE:mailto:${cleanRecipients[0]}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${eventType}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED', 
      'SEQUENCE:0', 'TRANSP:OPAQUE', 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{ 
      filename: 'invite.ics', 
      content: Buffer.from(icsString), 
      contentType: 'text/calendar; method=REQUEST' 
    }];

    const reviewUrl = `${siteUrl}/confirm/${eventId}`;

    emailContent = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
              <tr><td style="background-color: #8B4564; padding: 30px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Appointment Invitation</h1></td></tr>
              <tr>
                <td style="padding: 40px; text-align: center;">
                  <p style="font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 25px;">You have been invited to a new legal consultation.</p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-radius: 12px; padding: 24px; margin-bottom: 30px; text-align: left;">
                    <tr><td style="padding-bottom: 12px; font-weight: bold; color: #666666; width: 100px;">From:</td><td style="padding-bottom: 12px; color: #333333;">${organizer?.email || 'Your Lawyer'}</td></tr>
                    <tr><td style="padding-bottom: 12px; font-weight: bold; color: #666666; width: 100px;">Event:</td><td style="padding-bottom: 12px; font-weight: bold; color: #8B4564;">${eventType}</td></tr>
                    <tr><td style="padding-bottom: 12px; font-weight: bold; color: #666666;">Time:</td><td style="padding-bottom: 12px; color: #333333;">${startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td></tr>
                    ${notes ? `<tr><td style="font-weight: bold; color: #666666; vertical-align: top;">Notes:</td><td style="color: #666666; font-style: italic;">${notes}</td></tr>` : ''}
                  </table>
                  <p style="font-size: 14px; color: #666666; margin: 0;">You can add this to your calendar using the attached invitation file.</p>
                </td>
              </tr>
              <tr><td style="background-color: #f9f9f9; padding: 20px; text-align: center; color: #999999; font-size: 12px;">This is an automated message from ILoveLawyer.</td></tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  } else if (type === 'confirmation_success' && eventDetails) {
    const { eventType, dateTime, notes } = eventDetails;
    emailSubject = `Confirmed: ${eventType}`;
    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatG = (d: Date) => d.toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '');

    const uid = `success-${Date.now()}@ilovelawyer.com`;
    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${eventType}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{ filename: 'event.ics', content: Buffer.from(icsString), contentType: 'text/calendar; method=PUBLISH' }];
    emailContent = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
              <tr><td style="background-color: #10B981; padding: 30px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Confirmed!</h1></td></tr>
              <tr>
                <td style="padding: 40px; text-align: center;">
                  <p style="font-size: 16px; color: #333333;">Your appointment for <strong>${eventType}</strong> is now confirmed.</p>
                  <p style="font-size: 16px; color: #333333; margin-top: 20px;">${startDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  <p style="font-size: 14px; color: #666666; margin-top: 30px;">The event has been added to your calendar based on your confirmation.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  } else if (body) {
    // Markdown fallback
    const markdownToHtml = (md: string) => {
      let html = md.replace(/^### (.*$)/gim, '<h3>$1</h3>').replace(/^## (.*$)/gim, '<h2>$1</h2>').replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>').replace(/\*(.*?)\*/gim, '<em>$1</em>');
      return `<div style="font-family: sans-serif; padding: 20px;">${html.replace(/\n/g, '<br/>')}</div>`;
    };
    emailContent = markdownToHtml(body);
  }

  return await resend.emails.send({
    from: `Lawyer (${organizer?.email}) <updates@ilovelawyer.com>`,
    to: cleanRecipients,
    replyTo: organizer?.email,
    subject: emailSubject,
    html: emailContent,
    ...(attachments.length > 0 && { attachments }),
  });
}
