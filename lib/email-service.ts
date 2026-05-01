import { transporter, defaultFrom } from './mail-transport';
import { sendViaGmail } from './gmail-send';
import { Buffer } from 'buffer';

interface SendEmailParams {
  to: string | string[];
  subject?: string;
  body?: string;
  type?: 'schedule' | 'confirmation_success' | 'general' | 'reschedule' | 'cancelled' | 'reminder';
  eventDetails?: {
    eventId: string;
    eventType: string;
    dateTime: string;
    notes?: string;
    iCalUID?: string;
    isReminder?: boolean;
    reason?: string; // Used by reschedule and cancelled emails
  };
  organizer?: {
    name: string;
    email: string;
  };
  siteUrl: string;
  timezone?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
}

export async function sendEmail({
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
}: SendEmailParams) {
  const displayTimezone = timezone || 'UTC';

  const recipients = Array.isArray(to) ? to : [to];
  const cleanRecipients = recipients.map(r => r.trim().toLowerCase());
  // Extract just the email address from "Display Name <email>" format for ICS ATTENDEE fields
  const extractEmail = (addr: string): string => {
    const m = addr.match(/<([^>]+)>/);
    return m ? m[1] : addr;
  };

  let emailContent = body || '';
  let emailSubject = subject || 'Update from Legal Consultation';
  let attachments: any[] = [];

  // ─── SHARED HELPERS ────────────────────────────────────────────────────────

  const formatG = (d: Date) => d.toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '');

  const emailWrapper = (headerBg: string, headerLabel: string, bodyHtml: string) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <tr><td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <tr><td style="background-color: ${headerBg}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${headerLabel}</h1>
          </td></tr>
          <tr><td style="padding: 40px; text-align: center;">${bodyHtml}</td></tr>
          <tr><td style="background-color: #f9f9f9; padding: 20px; text-align: center; color: #999999; font-size: 12px;">This is an automated message from ILoveLawyer.</td></tr>
        </table>
      </td></tr>
    </table>
  `;

  const detailsTable = (rows: { label: string; value: string; accent?: boolean }[]) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-radius: 12px; padding: 24px; margin-bottom: 30px; text-align: left;">
      ${rows.map(r => `
        <tr>
          <td style="padding-bottom: 12px; font-weight: bold; color: #666666; width: 120px;">${r.label}:</td>
          <td style="padding-bottom: 12px; color: ${r.accent ? '#8B4564' : '#333333'}; font-weight: ${r.accent ? 'bold' : 'normal'};">${r.value}</td>
        </tr>
      `).join('')}
    </table>
  `;

  // ─── SCHEDULE (Original Invitation) ────────────────────────────────────────
  if (type === 'schedule' && eventDetails) {
    const { eventId, eventType, dateTime, notes, iCalUID } = eventDetails;
    emailSubject = 'New Appointment Invitation';

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const sequence = (eventDetails as any).isReminder ? '1' : '0';
    const uid = iCalUID || `${eventId}@ilovelawyer.com`;
    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=TRUE:mailto:${extractEmail(cleanRecipients[0])}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${eventType}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED',
      `SEQUENCE:${sequence}`, 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder: Appointment tomorrow', 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{
      filename: 'meeting_invite.ics',
      content: Buffer.from(icsString),
      contentType: 'text/calendar; charset=UTF-8; method=REQUEST'
    }];

    const rows = [
      { label: 'From', value: organizer?.email || 'Your Lawyer' },
      { label: 'Event', value: eventType, accent: true },
      { label: 'Time', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      ...(notes ? [{ label: 'Notes', value: notes }] : []),
    ];

    emailContent = emailWrapper(
      '#8B4564',
      'New Appointment Invitation',
      `<p style="font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 25px;">You have been invited to a new legal consultation.</p>
       ${detailsTable(rows)}
       <p style="font-size: 14px; color: #666666; margin: 0;">You can add this to your calendar using the attached invitation file.</p>`
    );

  // ─── REMINDER ────────────────────────────────────────────────────────────
  } else if (type === 'reminder' && eventDetails) {
    const { eventId, eventType, dateTime, notes, iCalUID } = eventDetails;
    emailSubject = `Reminder: Upcoming ${eventType}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@ilovelawyer.com`;

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=TRUE:mailto:${extractEmail(cleanRecipients[0])}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${eventType}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED',
      'SEQUENCE:1', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder: Appointment coming up', 'TRIGGER:-PT1H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{
      filename: 'reminder.ics',
      content: Buffer.from(icsString),
      contentType: 'text/calendar; charset=UTF-8; method=REQUEST'
    }];

    const rows = [
      { label: 'Event', value: eventType, accent: true },
      { label: 'Scheduled', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      { label: 'From', value: organizer?.email || 'Your Lawyer' },
      ...(notes ? [{ label: 'Notes', value: notes }] : []),
    ];

    emailContent = emailWrapper(
      '#8B4564',
      'Appointment Reminder',
      `<p style="font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 25px;">This is a friendly reminder about your upcoming appointment. Please confirm your attendance.</p>
       ${detailsTable(rows)}
       <p style="font-size: 14px; color: #666666; margin: 0;">Please reply to this email or contact your attorney if you have any questions.</p>`
    );

  // ─── RESCHEDULE ────────────────────────────────────────────────────────────
  } else if (type === 'reschedule' && eventDetails) {
    const { eventId, eventType, dateTime, notes, iCalUID, reason } = eventDetails;
    emailSubject = `Rescheduled: ${eventType}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@ilovelawyer.com`;

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=TRUE:mailto:${extractEmail(cleanRecipients[0])}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${eventType}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED',
      'SEQUENCE:2', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder: Rescheduled appointment', 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{
      filename: 'rescheduled_invite.ics',
      content: Buffer.from(icsString),
      contentType: 'text/calendar; charset=UTF-8; method=REQUEST'
    }];

    const rows = [
      { label: 'Event', value: eventType, accent: true },
      { label: 'New Time', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      { label: 'From', value: organizer?.email || 'Your Lawyer' },
      ...(reason ? [{ label: 'Reason', value: reason }] : []),
      ...(notes ? [{ label: 'Notes', value: notes }] : []),
    ];

    emailContent = emailWrapper(
      '#B45309',
      'Appointment Rescheduled',
      `<p style="font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 25px;">Your appointment has been <strong>rescheduled</strong> to a new date and time. Please review the updated details below and accept the new calendar invitation.</p>
       ${detailsTable(rows)}
       <p style="font-size: 14px; color: #666666; margin: 0;">An updated calendar invitation has been attached. Please accept it to update your calendar.</p>`
    );

  // ─── CANCELLED ─────────────────────────────────────────────────────────────
  } else if (type === 'cancelled' && eventDetails) {
    const { eventId, eventType, dateTime, iCalUID, reason } = eventDetails;
    emailSubject = `Cancelled: ${eventType}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@ilovelawyer.com`;

    // Send a CANCEL method iCal so the event is removed from the client's calendar
    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:CANCEL', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=FALSE:mailto:${extractEmail(cleanRecipients[0])}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${eventType}`, 'STATUS:CANCELLED',
      'SEQUENCE:3', 'TRANSP:TRANSPARENT',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{
      filename: 'cancellation.ics',
      content: Buffer.from(icsString),
      contentType: 'text/calendar; charset=UTF-8; method=CANCEL'
    }];

    const rows = [
      { label: 'Event', value: eventType },
      { label: 'Was Scheduled', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      { label: 'From', value: organizer?.email || 'Your Lawyer' },
      ...(reason ? [{ label: 'Reason', value: reason }] : []),
    ];

    emailContent = emailWrapper(
      '#6B7280',
      'Appointment Cancelled',
      `<p style="font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 25px;">We regret to inform you that the following appointment has been <strong>cancelled</strong>. We apologize for any inconvenience caused.</p>
       ${detailsTable(rows)}
       <p style="font-size: 14px; color: #666666; margin: 0;">If you have questions or would like to reschedule, please reach out to your attorney directly.</p>`
    );

  // ─── CONFIRMATION SUCCESS ──────────────────────────────────────────────────
  } else if (type === 'confirmation_success' && eventDetails) {
    const { eventType, dateTime, notes } = eventDetails;
    emailSubject = `Confirmed: ${eventType}`;
    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const uid = `success-${Date.now()}@ilovelawyer.com`;
    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${eventType}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder: Appointment tomorrow', 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{ filename: 'event.ics', content: Buffer.from(icsString), contentType: 'text/calendar; method=PUBLISH' }];

    emailContent = emailWrapper(
      '#10B981',
      'Appointment Confirmed!',
      `<p style="font-size: 16px; color: #333333;">Your appointment for <strong>${eventType}</strong> is now confirmed.</p>
       <p style="font-size: 16px; color: #333333; margin-top: 20px;">${startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' })}</p>
       <p style="font-size: 14px; color: #666666; margin-top: 30px;">The event has been added to your calendar based on your confirmation.</p>`
    );

  } else if (body) {
    // Markdown fallback
    const markdownToHtml = (md: string) => {
      let html = md.replace(/^### (.*$)/gim, '<h3>$1</h3>').replace(/^## (.*$)/gim, '<h2>$1</h2>').replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>').replace(/\*(.*?)\*/gim, '<em>$1</em>');
      return `<div style="font-family: sans-serif; padding: 20px;">${html.replace(/\n/g, '<br/>')}</div>`;
    };
    emailContent = markdownToHtml(body);
  }

  const from = organizer?.email
    ? `${organizer.name || organizer.email} <${organizer.email}>`
    : defaultFrom;

  // Use the Gmail API when the user has granted gmail.send access, so the
  // email is delivered from their own Gmail account. Fall back to SMTP when
  // no Google token is present (e.g. non-Google users or dev environment).
  if (googleAccessToken) {
    return sendViaGmail({
      accessToken: googleAccessToken,
      refreshToken: googleRefreshToken,
      from,
      to: cleanRecipients,
      subject: emailSubject,
      html: emailContent,
      attachments,
    });
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: cleanRecipients,
      replyTo: organizer?.email || defaultFrom,
      subject: emailSubject,
      html: emailContent,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { data: info, error: null };
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return { data: null, error };
  }
}
