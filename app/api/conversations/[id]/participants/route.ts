import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Owner or any participant can list members
  const conv = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id },
        { participants: { some: { userId: user.id } } },
      ],
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!conv) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    owner: conv.user,
    participants: participants.map(p => p.user),
  });
}
