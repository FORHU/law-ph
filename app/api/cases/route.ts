import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET() {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await prisma.case.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const cases = raw.map((c) => ({
    id: c.id,
    user_id: c.userId,
    case_name: c.caseName,
    party_involved: c.partyInvolved,
    notes: c.notes,
    created_at: c.createdAt,
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
    },
  }, { status: 201 });
}
