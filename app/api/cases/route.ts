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

  const newCase = await prisma.case.create({
    data: { userId: user.id, caseName, partyInvolved: partyInvolved || null, notes: notes || null },
  });

  return NextResponse.json({ case: newCase }, { status: 201 });
}
