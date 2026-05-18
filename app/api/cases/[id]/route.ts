import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const c = await prisma.case.findFirst({ where: { id, userId: user.id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    case: {
      id: c.id,
      user_id: c.userId,
      case_name: c.caseName,
      party_involved: c.partyInvolved,
      notes: c.notes,
      created_at: c.createdAt,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Delete the linked conversation (same id) then the case (cascade handles docs)
  await prisma.conversation.deleteMany({ where: { id, userId: user.id } });
  await prisma.case.deleteMany({ where: { id, userId: user.id } });

  return NextResponse.json({ success: true });
}
