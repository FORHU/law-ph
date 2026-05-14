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
  const cleanRecipients = recipients.map(r => r.replace(/\s+/g, '.').toLowerCase());

  let emailContent = body || '';
  let emailSubject = subject || 'Update from Legal Consultation';
  let attachments: any[] = [];

  // ─── SHARED HELPERS ────────────────────────────────────────────────────────

  const formatG = (d: Date) => d.toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '');

  const emailWrapper = (headerBg: string, headerLabel: string, bodyHtml: string) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: 'Georgia', serif; background-color: #0B0B0C; padding: 40px;">
      <tr><td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #111111; border-radius: 4px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid #722f37;">
          <tr><td style="background-color: ${headerBg}; padding: 40px; text-align: center; border-bottom: 2px solid #e9c176;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">${headerLabel}</h1>
          </td></tr>
          <tr><td style="padding: 50px 40px; text-align: center; color: #cccccc; font-size: 16px; line-height: 1.6;">${bodyHtml}</td></tr>
          <tr><td style="background-color: #0B0B0C; padding: 30px; text-align: center; color: #666666; font-size: 11px; border-top: 1px solid #333333; text-transform: uppercase; letter-spacing: 1px;">
            Institutional Legal Consultation Service • Confidential & Privileged
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;

  const detailsTable = (rows: { label: string; value: string; accent?: boolean }[]) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0B0B0C; border-radius: 0px; padding: 30px; margin-bottom: 30px; text-align: left; border-left: 4px solid #e9c176;">
      ${rows.map(r => `
        <tr>
          <td style="padding-bottom: 15px; font-weight: bold; color: #e9c176; width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">${r.label}:</td>
          <td style="padding-bottom: 15px; color: ${r.accent ? '#e9c176' : '#ffffff'}; font-weight: ${r.accent ? 'bold' : 'normal'}; font-size: 14px;">${r.value}</td>
        </tr>
      `).join('')}
    </table>
  `;

  // ─── SCHEDULE (Original Invitation) ────────────────────────────────────────
  if (type === 'schedule' && eventDetails) {
    const { eventId, eventType, dateTime, notes, iCalUID } = eventDetails;
    emailSubject = 'Institutional Appointment Invitation';

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const sequence = (eventDetails as any).isReminder ? '1' : '0';
    const uid = iCalUID || `${eventId}@law-firm.institutional`;
    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=TRUE:mailto:${cleanRecipients[0]}`,
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
      { label: 'Origin', value: organizer?.email || 'Institutional Legal Services' },
      { label: 'Procedure', value: eventType, accent: true },
      { label: 'Scheduled', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      ...(notes ? [{ label: 'Stipulations', value: notes }] : []),
    ];

    emailContent = emailWrapper(
      '#722f37',
      'Appointment Invitation',
      `<p style="margin-bottom: 25px;">You have been summoned to a new institutional legal consultation. Please review the details below.</p>
       ${detailsTable(rows)}
       <p style="font-size: 13px; color: #999999;">An encrypted invitation file has been attached for your digital calendar.</p>`
    );

  // ─── REMINDER ────────────────────────────────────────────────────────────
  } else if (type === 'reminder' && eventDetails) {
    const { eventId, eventType, dateTime, notes, iCalUID } = eventDetails;
    emailSubject = `Official Reminder: ${eventType}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@law-firm.institutional`;

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=TRUE:mailto:${cleanRecipients[0]}`,
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
      { label: 'Procedure', value: eventType, accent: true },
      { label: 'Scheduled', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      { label: 'Origin', value: organizer?.email || 'Institutional Legal Services' },
      ...(notes ? [{ label: 'Stipulations', value: notes }] : []),
    ];

    emailContent = emailWrapper(
      '#722f37',
      'Procedural Reminder',
      `<p style="margin-bottom: 25px;">This serves as a formal notification regarding your upcoming consultation. Please ensure your availability.</p>
       ${detailsTable(rows)}
       <p style="font-size: 13px; color: #999999;">Contact the presiding attorney should you require further clarification.</p>`
    );

  // ─── RESCHEDULE ────────────────────────────────────────────────────────────
  } else if (type === 'reschedule' && eventDetails) {
    const { eventId, eventType, dateTime, notes, iCalUID, reason } = eventDetails;
    emailSubject = `Rescheduled: ${eventType}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@law-firm.institutional`;

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=TRUE:mailto:${cleanRecipients[0]}`,
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
      { label: 'Procedure', value: eventType, accent: true },
      { label: 'New Schedule', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      { label: 'Origin', value: organizer?.email || 'Institutional Legal Services' },
      ...(reason ? [{ label: 'Justification', value: reason }] : []),
      ...(notes ? [{ label: 'Stipulations', value: notes }] : []),
    ];

    emailContent = emailWrapper(
      '#B45309',
      'Procedure Rescheduled',
      `<p style="margin-bottom: 25px;">Your appointment has been <strong>rescheduled</strong>. Please acknowledge the updated procedural timeline below.</p>
       ${detailsTable(rows)}
       <p style="font-size: 13px; color: #999999;">An updated calendar invitation is attached for your synchronization.</p>`
    );

  // ─── CANCELLED ─────────────────────────────────────────────────────────────
  } else if (type === 'cancelled' && eventDetails) {
    const { eventId, eventType, dateTime, iCalUID, reason } = eventDetails;
    emailSubject = `Cancelled: ${eventType}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@law-firm.institutional`;

    // Send a CANCEL method iCal so the event is removed from the client's calendar
    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:CANCEL', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Participant";RSVP=FALSE:mailto:${cleanRecipients[0]}`,
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
      { label: 'Procedure', value: eventType },
      { label: 'Was Scheduled', value: startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' }) },
      { label: 'Origin', value: organizer?.email || 'Institutional Legal Services' },
      ...(reason ? [{ label: 'Justification', value: reason }] : []),
    ];

    emailContent = emailWrapper(
      '#6B7280',
      'Procedure Terminated',
      `<p style="margin-bottom: 25px;">Notice: The following legal procedure has been <strong>terminated</strong>. We apologize for the disruption.</p>
       ${detailsTable(rows)}
       <p style="font-size: 13px; color: #999999;">Should you wish to initiate a new session, please contact your attorney.</p>`
    );

  // ─── CONFIRMATION SUCCESS ──────────────────────────────────────────────────
  } else if (type === 'confirmation_success' && eventDetails) {
    const { eventType, dateTime, notes } = eventDetails;
    emailSubject = `Confirmed: ${eventType}`;
    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const uid = `success-${Date.now()}@law-firm.institutional`;
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
      'Procedure Confirmed',
      `<p>Your consultation for <strong>${eventType}</strong> has been successfully ratified.</p>
       <p style="font-size: 20px; color: #ffffff; margin: 30px 0; font-weight: bold;">${startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short' })}</p>
       <p style="font-size: 13px; color: #999999;">The procedure has been logged in your institutional calendar.</p>`
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
