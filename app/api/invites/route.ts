import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

const INVITE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await req.json();
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  // Verify ownership
  const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Delete any existing invite for this conversation (rotates the token)
    await prisma.conversationInvite.deleteMany({ where: { conversationId } });

    const invite = await prisma.conversationInvite.create({
      data: {
        conversationId,
        createdBy: user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    return NextResponse.json({ invite });
  } catch (err: any) {
    console.error("[POST /api/invites] Prisma error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
