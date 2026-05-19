import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id },
        {
          clientEmail: {
            contains: user.email,
            mode: "insensitive",
          },
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
        },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updateData: any = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.google_link !== undefined) updateData.googleLink = body.google_link;
  if (body.google_event_id !== undefined) updateData.googleEventId = body.google_event_id;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.date_time !== undefined) updateData.dateTime = new Date(body.date_time);
  if (body.client_email !== undefined) updateData.clientEmail = body.client_email;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.last_reminder_sent_at !== undefined) updateData.lastReminderSentAt = new Date(body.last_reminder_sent_at);
  if (body.lawyer_acknowledged_at !== undefined) updateData.lawyerAcknowledgedAt = new Date(body.lawyer_acknowledged_at);

  try {
    const updated = await prisma.event.updateMany({
      where: {
        id,
        OR: [
          { userId: user.id },
          {
            clientEmail: {
              contains: user.email,
              mode: "insensitive",
            },
          },
        ],
      },
      data: updateData,
    });

    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/events PUT]", err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.event.deleteMany({ where: { id, userId: user.id } });

  return NextResponse.json({ success: true });
}
