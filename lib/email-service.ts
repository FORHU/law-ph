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
    title?: string;
    dateTime: string;
    notes?: string;
    iCalUID?: string;
    isReminder?: boolean;
    reason?: string;
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

type EventTypeName = 'meeting' | 'appointment' | 'hearing' | 'deposition';

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

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const formatDate = (d: Date) => d.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: displayTimezone, timeZoneName: 'short'
  });

  const emailWrapper = (accentColor: string, badge: string, badgeBg: string, bodyHtml: string) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 32px 16px;">
      <tr><td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="560" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.10); border-top: 4px solid ${accentColor};">

          <!-- Header -->
          <tr><td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
            <table width="100%"><tr>
              <td><span style="font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: -0.3px;">ilovelawyer</span></td>
              <td align="right"><span style="display: inline-block; background-color: ${badgeBg}; color: ${accentColor}; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; border: 1px solid ${accentColor}30;">${badge}</span></td>
            </tr></table>
          </td></tr>

          <!-- Body -->
          <tr><td style="padding: 32px 40px; color: #3f3f46; font-size: 15px; line-height: 1.7;">${bodyHtml}</td></tr>

          <!-- Footer -->
          <tr><td style="background-color: #fafafa; padding: 20px 40px; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.6;">
              This email was sent by <strong style="color: #71717a;">${organizer?.name || organizer?.email || 'ilovelawyer'}</strong> via ilovelawyer.<br>
              All communications are confidential and protected under attorney-client privilege.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;

  const detailsCard = (rows: { label: string; value: string }[]) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9fb; border-radius: 6px; border: 1px solid #e4e4e7; margin: 20px 0; overflow: hidden;">
      ${rows.map((r, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9fb'};">
          <td style="padding: 12px 20px; width: 150px; font-size: 12px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${r.label}</td>
          <td style="padding: 12px 20px; font-size: 14px; color: #18181b; border-bottom: 1px solid #f0f0f0;">${r.value}</td>
        </tr>
      `).join('')}
    </table>
  `;

  const normalizeEventType = (rawType: string) => {
    const normalized = rawType.toLowerCase();
    if (normalized === 'meeting' || normalized === 'appointment' || normalized === 'hearing' || normalized === 'deposition') {
      return normalized as EventTypeName;
    }
    return 'meeting';
  };

  const eventTheme = (rawType: string) => {
    const normalized = normalizeEventType(rawType);
    const themes = {
      meeting: { accent: '#3b82f6', badgeBg: '#eff6ff' },
      appointment: { accent: '#d97706', badgeBg: '#fffbeb' },
      hearing: { accent: '#722f37', badgeBg: '#fdf2f3' },
      deposition: { accent: '#7c3aed', badgeBg: '#f5f3ff' },
    };
    return themes[normalized];
  };

  const eventCopy = (rawType: string) => {
    const normalized = normalizeEventType(rawType);
    const label = capitalize(normalized);
    return {
      label,
      noun: normalized,
      detailLabel: label,
      inviteBadge: `New ${label}`,
      reminderBadge: `${label} Reminder`,
      rescheduledBadge: `${label} Rescheduled`,
      cancelledBadge: `${label} Cancelled`,
      confirmedBadge: `${label} Confirmed`,
      alarmReminder: `Reminder: ${label} tomorrow`,
      alarmRescheduled: `Rescheduled ${normalized} reminder`,
    };
  };

  // ─── SCHEDULE (New Appointment Invitation) ─────────────────────────────────
  if (type === 'schedule' && eventDetails) {
    const { eventId, eventType, title, dateTime, notes, iCalUID } = eventDetails;
    const copy = eventCopy(eventType);
    const theme = eventTheme(eventType);
    const displayTitle = title || copy.label;
    emailSubject = `${copy.label} Invitation: ${displayTitle}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@ilovelawyer.app`;

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Guest";RSVP=TRUE:mailto:${cleanRecipients[0]}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${displayTitle}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED',
      'SEQUENCE:0', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${copy.alarmReminder}`, 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{ filename: 'invite.ics', content: Buffer.from(icsString), contentType: 'text/calendar; charset=UTF-8; method=REQUEST' }];

    emailContent = emailWrapper(theme.accent, copy.inviteBadge, theme.badgeBg,
      `<h2 style="margin: 0 0 8px; font-size: 22px; color: #18181b;">${displayTitle}</h2>
       <p style="margin: 0 0 24px; color: #71717a; font-size: 14px;">You have a new ${copy.noun} invitation from <strong>${organizer?.name || organizer?.email}</strong>. Please review the details below.</p>
       ${detailsCard([
         { label: 'Attorney', value: `${organizer?.name || ''} &lt;${organizer?.email || ''}&gt;` },
         { label: 'Type', value: capitalize(eventType) },
         { label: 'Date & Time', value: formatDate(startDate) },
         { label: 'Duration', value: '1 hour' },
         ...(notes ? [{ label: 'Notes', value: notes }] : []),
       ])}
       <p style="font-size: 13px; color: #71717a; margin-top: 20px;">A calendar invitation (.ics) is attached. Open it to add this ${copy.noun} to your calendar.</p>
       <p style="font-size: 13px; color: #71717a;">If you have any questions, please reply directly to this email.</p>`
    );

  // ─── REMINDER ─────────────────────────────────────────────────────────────
  } else if (type === 'reminder' && eventDetails) {
    const { eventId, eventType, title, dateTime, notes, iCalUID } = eventDetails;
    const copy = eventCopy(eventType);
    const theme = eventTheme(eventType);
    const displayTitle = title || copy.label;
    emailSubject = `Reminder: ${displayTitle} - Coming Up Soon`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@ilovelawyer.app`;
    const cleanNotes = (notes || '').replace(/\[type:[^\]]+\]\n?/, '').trim();

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Guest";RSVP=TRUE:mailto:${cleanRecipients[0]}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${displayTitle}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED',
      'SEQUENCE:0', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${copy.alarmReminder}`, 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{ filename: 'invite.ics', content: Buffer.from(icsString), contentType: 'text/calendar; charset=UTF-8; method=REQUEST' }];

    emailContent = emailWrapper(theme.accent, copy.reminderBadge, theme.badgeBg,
      `<h2 style="margin: 0 0 8px; font-size: 22px; color: #18181b;">You have an upcoming ${copy.noun}</h2>
       <p style="margin: 0 0 24px; color: #71717a; font-size: 14px;">This is a reminder from <strong>${organizer?.name || organizer?.email}</strong> about your scheduled ${copy.noun}.</p>
       ${detailsCard([
         { label: copy.detailLabel, value: displayTitle },
         { label: 'Type', value: capitalize(eventType) },
         { label: 'Attorney', value: `${organizer?.name || ''} &lt;${organizer?.email || ''}&gt;` },
         { label: 'Date & Time', value: formatDate(startDate) },
         { label: 'Duration', value: '1 hour' },
         ...(cleanNotes ? [{ label: 'Notes', value: cleanNotes }] : []),
       ])}
       <p style="font-size: 13px; color: #71717a; margin-top: 20px;">A calendar invitation (.ics) is attached. Open it to add this ${copy.noun} to your calendar or update your RSVP status.</p>
       <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">If you need to reschedule, contact your attorney directly.</p>`
    );

  // ─── RESCHEDULE ───────────────────────────────────────────────────────────
  } else if (type === 'reschedule' && eventDetails) {
    const { eventId, eventType, title, dateTime, notes, iCalUID, reason } = eventDetails;
    const copy = eventCopy(eventType);
    const theme = eventTheme(eventType);
    const displayTitle = title || copy.label;
    emailSubject = `Rescheduled: ${displayTitle}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@ilovelawyer.app`;

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Guest";RSVP=TRUE:mailto:${cleanRecipients[0]}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${displayTitle}`, `DESCRIPTION:${(notes || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED',
      'SEQUENCE:2', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${copy.alarmRescheduled}`, 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{ filename: 'updated_invite.ics', content: Buffer.from(icsString), contentType: 'text/calendar; charset=UTF-8; method=REQUEST' }];

    emailContent = emailWrapper(theme.accent, copy.rescheduledBadge, theme.badgeBg,
      `<h2 style="margin: 0 0 8px; font-size: 22px; color: #18181b;">Your ${copy.noun} has been rescheduled</h2>
       <p style="margin: 0 0 24px; color: #71717a; font-size: 14px;"><strong>${organizer?.name || organizer?.email}</strong> has updated the schedule for your ${copy.noun}. Please take note of the new date and time.</p>
       ${detailsCard([
         { label: copy.detailLabel, value: displayTitle },
         { label: 'Type', value: capitalize(eventType) },
         { label: 'Attorney', value: `${organizer?.name || ''} &lt;${organizer?.email || ''}&gt;` },
         { label: 'New Date & Time', value: formatDate(startDate) },
         { label: 'Duration', value: '1 hour' },
         ...(reason ? [{ label: 'Reason', value: reason }] : []),
         ...(notes ? [{ label: 'Notes', value: notes }] : []),
       ])}
       <p style="font-size: 13px; color: #71717a; margin-top: 20px;">An updated calendar invitation is attached. Please open it to update your calendar.</p>`
    );

  // ─── CANCELLED ────────────────────────────────────────────────────────────
  } else if (type === 'cancelled' && eventDetails) {
    const { eventId, eventType, title, dateTime, iCalUID, reason } = eventDetails;
    const copy = eventCopy(eventType);
    const theme = eventTheme(eventType);
    const displayTitle = title || copy.label;
    emailSubject = `${copy.label} Cancelled: ${displayTitle}`;

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const uid = iCalUID || `${eventId}@ilovelawyer.app`;

    const icsString = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:CANCEL', 'BEGIN:VEVENT',
      `ORGANIZER;CN="${organizer?.name || organizer?.email}":mailto:${organizer?.email}`,
      `ATTENDEE;CN="Guest";RSVP=FALSE:mailto:${cleanRecipients[0]}`,
      `UID:${uid}`, `DTSTAMP:${formatG(new Date())}Z`, `DTSTART:${formatG(startDate)}Z`, `DTEND:${formatG(endDate)}Z`,
      `SUMMARY:${displayTitle}`, 'STATUS:CANCELLED', 'SEQUENCE:3', 'TRANSP:TRANSPARENT',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    attachments = [{ filename: 'cancellation.ics', content: Buffer.from(icsString), contentType: 'text/calendar; charset=UTF-8; method=CANCEL' }];

    emailContent = emailWrapper(theme.accent, copy.cancelledBadge, theme.badgeBg,
      `<h2 style="margin: 0 0 8px; font-size: 22px; color: #18181b;">Your ${copy.noun} has been cancelled</h2>
       <p style="margin: 0 0 24px; color: #71717a; font-size: 14px;"><strong>${organizer?.name || organizer?.email}</strong> has cancelled the following ${copy.noun}. We apologize for any inconvenience.</p>
       ${detailsCard([
         { label: copy.detailLabel, value: displayTitle },
         { label: 'Type', value: capitalize(eventType) },
         { label: 'Attorney', value: `${organizer?.name || ''} &lt;${organizer?.email || ''}&gt;` },
         { label: 'Was Scheduled', value: formatDate(startDate) },
         ...(reason ? [{ label: 'Reason', value: reason }] : []),
       ])}
       <p style="font-size: 13px; color: #71717a; margin-top: 20px;">To schedule a new ${copy.noun}, please contact your attorney directly or reply to this email.</p>`
    );

  // ─── CONFIRMATION SUCCESS ─────────────────────────────────────────────────
  } else if (type === 'confirmation_success' && eventDetails) {
    const { eventType, title, dateTime, notes } = eventDetails;
    const copy = eventCopy(eventType);
    const theme = eventTheme(eventType);
    const displayTitle = title || copy.label;
    emailSubject = `Confirmed: ${displayTitle}`;
    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    emailContent = emailWrapper(theme.accent, copy.confirmedBadge, theme.badgeBg,
      `<h2 style="margin: 0 0 8px; font-size: 22px; color: #18181b;">You have confirmed your ${copy.noun}</h2>
       <p style="margin: 0 0 24px; color: #71717a; font-size: 14px;">Your attendance for the following ${copy.noun} has been confirmed.</p>
       ${detailsCard([
         { label: copy.detailLabel, value: displayTitle },
         { label: 'Type', value: capitalize(eventType) },
         { label: 'Date & Time', value: formatDate(startDate) },
         { label: 'Duration', value: '1 hour' },
         ...(notes ? [{ label: 'Notes', value: notes }] : []),
       ])}
       <p style="font-size: 13px; color: #71717a; margin-top: 20px;">If you need to cancel or reschedule, please contact your attorney as soon as possible.</p>`
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
    if (!googleAccessToken && !process.env.SMTP_USER) {
      console.warn('[Email Mock] No SMTP credentials provided. Mocking email send to:', cleanRecipients);
      return { data: { mocked: true }, error: null };
    }

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
