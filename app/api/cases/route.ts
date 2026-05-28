import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  // Find conversation IDs where this user is a participant (but not the owner)
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    select: { conversationId: true },
  });
  const sharedCaseIds = participations.map((p) => p.conversationId);

  const searchFilter = search
    ? {
        OR: [
          { caseName: { contains: search, mode: "insensitive" as const } },
          { partyInvolved: { contains: search, mode: "insensitive" as const } },
          { notes: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const raw = await prisma.case.findMany({
    where: {
      AND: [
        { OR: [{ userId: user.id }, { id: { in: sharedCaseIds } }] },
        ...(search ? [searchFilter] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const cases = raw.map((c) => ({
    id: c.id,
    user_id: c.userId,
    case_name: c.caseName,
    party_involved: c.partyInvolved,
    notes: c.notes,
    created_at: c.createdAt,
    is_shared: c.userId !== user.id,
  }));

  return NextResponse.json({ cases });
}

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const caseName = body.caseName || body.name;
  const partyInvolved = body.partyInvolved || body.party || null;
  const { notes } = body;

  if (!caseName) {
    return NextResponse.json({ error: "caseName is required" }, { status: 400 });
  }

  const newCase = await prisma.$transaction(async (tx) => {
    const c = await tx.case.create({
      data: { userId: user.id, caseName, partyInvolved: partyInvolved || null, notes: notes || null },
    });

    await tx.conversation.create({
      data: {
        id: c.id,
        userId: user.id,
        title: `[CASE] ${caseName}`,
      },
    });

    return c;
  });

  return NextResponse.json({
    case: {
      id: newCase.id,
      user_id: newCase.userId,
      case_name: newCase.caseName,
      party_involved: newCase.partyInvolved,
      notes: newCase.notes,
      created_at: newCase.createdAt,
      is_shared: false,
    },
  }, { status: 201 });
}
