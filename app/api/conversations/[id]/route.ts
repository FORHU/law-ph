import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();

  await prisma.conversation.updateMany({
    where: { id, userId: user.id },
    data: { title },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // If the caller owns the conversation, delete it entirely.
  // If they're only a participant, treat "delete" as "leave" so the case
  // survives for everyone else.
  const owned = await prisma.conversation.findFirst({ where: { id, userId: user.id } });

  if (owned) {
    await prisma.conversation.delete({ where: { id } });
  } else {
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: id, userId: user.id },
    });
  }

  return NextResponse.json({ success: true });
}
