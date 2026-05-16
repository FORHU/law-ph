import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function PUT(req: Request, { params }: { params: Promise<{ googleEventId: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { googleEventId } = await params;
  const body = await req.json();

  const updateData: any = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.google_link !== undefined) updateData.googleLink = body.google_link;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.date_time !== undefined) updateData.dateTime = new Date(body.date_time);
  if (body.client_email !== undefined) updateData.clientEmail = body.client_email;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = await prisma.event.updateMany({
    where: { googleEventId, userId: user.id },
    data: updateData,
  });

  return NextResponse.json({ success: true, count: updated.count });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ googleEventId: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { googleEventId } = await params;
  await prisma.event.deleteMany({ where: { googleEventId, userId: user.id } });

  return NextResponse.json({ success: true });
}
