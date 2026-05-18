import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET() {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cases = await prisma.case.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ cases });
}

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { caseName, partyInvolved, notes } = await req.json();

  if (!caseName) {
    return NextResponse.json({ error: "caseName is required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const newCase = await tx.case.create({
      data: { userId: user.id, caseName, partyInvolved: partyInvolved || null, notes: notes || null },
    });

    await tx.conversation.create({
      data: {
        id: newCase.id,
        userId: user.id,
        title: `[CASE] ${caseName}`,
      },
    });

    return newCase;
  });

  return NextResponse.json({ case: result }, { status: 201 });
}
