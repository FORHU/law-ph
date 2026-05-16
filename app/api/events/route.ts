import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startRange = searchParams.get("startRange");
  const endRange = searchParams.get("endRange");
  const excludeId = searchParams.get("excludeId");
  const excludeStatus = searchParams.get("excludeStatus");
  const limitOne = searchParams.get("limitOne") === "true";

  const where: any = { userId: user.id };
  if (startRange) where.dateTime = { ...(where.dateTime || {}), gte: new Date(startRange) };
  if (endRange) where.dateTime = { ...(where.dateTime || {}), lte: new Date(endRange) };
  if (excludeId) where.id = { not: excludeId };
  if (excludeStatus) where.status = { not: excludeStatus };

  const events = await prisma.event.findMany({
    where,
    ...(limitOne && { take: 1 }),
    orderBy: { dateTime: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const event = await prisma.event.create({
    data: {
      userId: user.id,
      title: body.title || "Consultation",
      type: body.type || "Meeting",
      dateTime: new Date(body.date_time || body.dateTime),
      clientEmail: body.client_email || body.clientEmail || null,
      notes: body.notes || null,
      status: body.status || "pending",
      googleLink: body.google_link || null,
      googleEventId: body.google_event_id || null,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
