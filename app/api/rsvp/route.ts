import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';

function makeToken(eventId: string, action: string, email: string) {
  return createHmac('sha256', process.env.JWT_SECRET || 'fallback')
    .update(`${eventId}:${action}:${email.toLowerCase()}`)
    .digest('hex');
}

export function generateRsvpToken(eventId: string, action: 'yes' | 'no' | 'maybe', email: string) {
  return makeToken(eventId, action, email);
}

function page(title: string, message: string, color: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#f4f4f5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}.card{background:#fff;border-radius:8px;border-top:4px solid ${color};box-shadow:0 4px 16px rgba(0,0,0,.1);padding:40px;max-width:440px;width:100%;text-align:center}.logo{font-size:20px;font-weight:700;color:#18181b;margin-bottom:24px}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;color:#18181b;margin-bottom:8px}p{color:#71717a;font-size:14px;line-height:1.6}</style>
    </head><body><div class="card"><div class="logo">ilovelawyer</div><div class="icon">${color === '#22c55e' ? '✅' : '❌'}</div><h1>${title}</h1><p>${message}</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

const ACTION_MAP: Record<string, { status: string; label: string; color: string }> = {
  yes:   { status: 'confirmed',  label: 'Accepted',  color: '#22c55e' },
  no:    { status: 'denied',     label: 'Declined',  color: '#ef4444' },
  maybe: { status: 'tentative',  label: 'Tentative', color: '#f59e0b' },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('event');
  const action  = searchParams.get('action');
  const email   = searchParams.get('email');
  const token   = searchParams.get('token');

  if (!eventId || !action || !email || !token) {
    return page('Invalid Link', 'This RSVP link is missing required parameters.', '#ef4444');
  }

  const mapped = ACTION_MAP[action];
  if (!mapped) {
    return page('Invalid Action', 'The RSVP action is not recognized.', '#ef4444');
  }

  const expected = makeToken(eventId, action, email);
  if (expected !== token) {
    return page('Invalid Token', 'This RSVP link is invalid or has been tampered with.', '#ef4444');
  }

  try {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        clientEmail: { contains: email, mode: 'insensitive' },
      },
    });

    if (!event) {
      return page('Event Not Found', 'This event no longer exists or this email is not associated with it.', '#ef4444');
    }

    if (event.status === 'cancelled' || event.status === 'canceled') {
      return page('Event Cancelled', 'This event has already been cancelled by the organizer.', '#f59e0b');
    }

    if (event.status === mapped.status) {
      return page(
        `Already ${mapped.label}`,
        `You have already responded to this invitation.`,
        mapped.color
      );
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { status: mapped.status },
    });

    return page(
      mapped.label,
      `Your response (<strong>${action}</strong>) for <strong>${event.title}</strong> has been recorded. The organizer has been notified.`,
      mapped.color
    );
  } catch (err) {
    console.error('[api/rsvp]', err);
    return page('Error', 'Something went wrong. Please try again or contact the organizer.', '#ef4444');
  }
}
