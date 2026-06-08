import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: conversationId, userId: targetUserId } = await params;

  // Only the case owner can remove participants
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
  });
  if (!conv) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const removedUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true },
  });

  try {
    await prisma.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });
  } catch (e: any) {
    if (e.code === "P2025") {
      // Already removed — idempotent
      return NextResponse.json({ ok: true });
    }
    throw e;
  }

  await prisma.message.create({
    data: {
      conversationId,
      role: "system",
      content: `${removedUser?.name || removedUser?.email || "A member"} was removed from the case.`,
    },
  });

  return NextResponse.json({ ok: true });
}
