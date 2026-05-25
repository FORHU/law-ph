import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshGoogleAccessToken } from '@/lib/google-token';

function inferEventType(title?: string, description?: string): string {
  const typeMatch = description?.match(/\[type:(meeting|appointment|hearing|deposition)\]/);
  if (typeMatch) return typeMatch[1];
  const text = `${title ?? ''} ${description ?? ''}`.toLowerCase();
  if (text.includes('hearing')) return 'hearing';
  if (text.includes('deposition')) return 'deposition';
  if (text.includes('appointment')) return 'appointment';
  return 'meeting';
}

function getEventStatus(e: any): string {
  if (e.status === 'cancelled') return 'cancelled';
  if (e.attendees && Array.isArray(e.attendees)) {
    const guests = e.attendees.filter((a: any) => !a.organizer);
    if (guests.length > 0) {
      if (guests.every((a: any) => a.responseStatus === 'declined')) return 'denied';
      if (guests.some((a: any) => a.responseStatus === 'accepted')) return 'confirmed';
      if (guests.some((a: any) => a.responseStatus === 'tentative')) return 'tentative';
      return 'pending';
    }
  }
  return 'confirmed';
}

export async function POST(req: Request) {
  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');

    console.log(`[Calendar Webhook] state=${resourceState} channel=${channelId}`);

    if (resourceState === 'sync') return new Response('Sync acknowledged', { status: 200 });
    if (resourceState !== 'exists' || !channelId) return new Response('Ignored', { status: 200 });

    // Look up which user owns this channel
    const channel = await prisma.calendarWatchChannel.findUnique({
      where: { channelId },
    });

    if (!channel) {
      console.error('[Calendar Webhook] Unknown channel:', channelId);
      return new Response('Unknown channel', { status: 200 });
    }

    const userId = channel.userId;

    // Get the user's stored refresh token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });
    if (!user) {
      console.error('[Calendar Webhook] User not found:', userId);
      return new Response('User not found', { status: 200 });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.error('[Calendar Webhook] No refresh token for user:', userId);
      return new Response('No refresh token', { status: 200 });
    }

    const accessToken = await refreshGoogleAccessToken(refreshToken);
    if (!accessToken) {
      console.error('[Calendar Webhook] Token refresh failed for user:', userId);
      return new Response('Token refresh failed', { status: 200 });
    }

    // Fetch events from start of current month so past events in the same month are included
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', monthStart.toISOString());
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set(
      'fields',
      'items(id,summary,description,start,htmlLink,attendees(email,responseStatus,organizer),status,iCalUID)',
    );

    const googleRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok) {
      const err = await googleRes.text();
      console.error('[Calendar Webhook] Google Calendar fetch failed:', err);
      return new Response('Google fetch failed', { status: 200 });
    }

    const googleData = await googleRes.json();
    const googleEvents: any[] = googleData.items ?? [];

    if (googleEvents.length === 0) return new Response('No events to sync', { status: 200 });

    // Sync events
    for (const ge of googleEvents) {
      if (ge.status === 'cancelled') continue;

      const geTitle = ge.summary ?? 'Untitled';
      const geTime = ge.start?.dateTime ?? ge.start?.date;
      if (!geTime) continue;

      const localMatch = await prisma.event.findFirst({
        where: {
          userId,
          googleEventId: null,
          title: geTitle,
          dateTime: new Date(geTime),
        },
      });

      if (localMatch) {
        await prisma.event.update({
          where: { id: localMatch.id },
          data: {
            googleEventId: ge.id,
            googleLink: ge.htmlLink ?? localMatch.googleLink,
            status: getEventStatus(ge),
          },
        });
      } else {
        await prisma.event.upsert({
          where: { googleEventId_userId: { googleEventId: ge.id, userId } },
          create: {
            userId,
            googleEventId: ge.id,
            title: geTitle,
            type: inferEventType(geTitle, ge.description),
            dateTime: new Date(geTime),
            notes: ge.description?.replace(/\[type:[^\]]+\]\n?/, '').trim() || null,
            googleLink: ge.htmlLink ?? null,
            status: getEventStatus(ge),
          },
          update: {
            title: geTitle,
            type: inferEventType(geTitle, ge.description),
            status: getEventStatus(ge),
            googleLink: ge.htmlLink ?? null,
          },
        });
      }
    }

    // Delete cancelled events
    const cancelledIds = googleEvents
      .filter((e: any) => e.status === 'cancelled' && e.id)
      .map((e: any) => e.id);

    if (cancelledIds.length > 0) {
      await prisma.event.deleteMany({
        where: { userId, googleEventId: { in: cancelledIds } },
      });
    }

    return new Response('Synced', { status: 200 });
  } catch (error) {
    console.error('[Calendar Webhook] Unexpected error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
