import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await req.json();
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  // Verify ownership
  const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Upsert invite
  const invite = await prisma.conversationInvite.upsert({
    where: { conversationId },
    create: { conversationId, createdBy: user.id },
    update: {},
  });

  return NextResponse.json({ invite });
}
