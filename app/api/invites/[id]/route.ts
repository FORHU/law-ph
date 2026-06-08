import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invite = await prisma.conversationInvite.findUnique({ where: { id } });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  return NextResponse.json({ invite });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invite = await prisma.conversationInvite.findUnique({ where: { id } });

  if (!invite) return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite link has expired." }, { status: 410 });

  try {
    await prisma.conversationParticipant.create({
      data: { conversationId: invite.conversationId, userId: user.id },
    });

    await prisma.message.create({
      data: {
        conversationId: invite.conversationId,
        role: "system",
        content: `${user.name || user.email} joined the case.`,
        userId: user.id,
      },
    });

    return NextResponse.json({ conversationId: invite.conversationId });
  } catch (e: any) {
    if (e.code === "P2002") {
      // Already a participant — idempotent
      return NextResponse.json({ conversationId: invite.conversationId });
    }
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
