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

  const where: any = {
    AND: [
      {
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
    ],
  };

  const andConditions = where.AND;

  if (startRange) {
    andConditions.push({ dateTime: { gte: new Date(startRange) } });
  }
  if (endRange) {
    andConditions.push({ dateTime: { lte: new Date(endRange) } });
  }
  if (excludeId) {
    andConditions.push({ id: { not: excludeId } });
  }
  if (excludeStatus) {
    andConditions.push({ status: { not: excludeStatus } });
  }

  try {
    const events = await prisma.event.findMany({
      where,
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
      ...(limitOne && { take: 1 }),
      orderBy: { dateTime: "asc" },
    });

    return NextResponse.json({ events });
  } catch (err) {
    console.error("[api/events GET]", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
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
