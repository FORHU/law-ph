import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify conversation belongs to user (or user is a participant)
  let conversation = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id },
        { participants: { some: { userId: user.id } } },
      ],
    },
  });

  if (!conversation) {
    // Self-healing: If a Case exists with this ID, create the missing linked Conversation record
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId: user.id },
    });

    if (caseRecord) {
      conversation = await prisma.conversation.create({
        data: {
          id: caseRecord.id,
          userId: user.id,
          title: `[CASE] ${caseRecord.caseName}`,
        },
      });
    } else {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}
