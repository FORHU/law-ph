import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";
import { MessageRole } from "@/generated/prisma/client";

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversation_id, role, content, imagePreview, created_at, parent_message_id } = await req.json();

  if (!conversation_id || !role || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Self-healing: ensure the Conversation row exists before inserting the message.
    const conversationExists = await prisma.conversation.findUnique({
      where: { id: conversation_id },
    });

    if (!conversationExists) {
      const caseRecord = await prisma.case.findFirst({
        where: { id: conversation_id, userId: user.id },
      });

      if (caseRecord) {
        await prisma.conversation.create({
          data: {
            id: caseRecord.id,
            userId: user.id,
            title: `[CASE] ${caseRecord.caseName}`,
          },
        });
      } else {
        // No matching case either — create a blank conversation so the FK constraint is satisfied.
        await prisma.conversation.create({
          data: {
            id: conversation_id,
            userId: user.id,
            title: 'Consultation',
          },
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation_id,
        role: role as MessageRole,
        content,
        imagePreview: imagePreview ?? null,
        createdAt: created_at ? new Date(created_at) : new Date(),
        // Attribute user messages to the sender so group chats can show who prompted
        ...(role === 'user' ? { userId: user.id } : {}),
        ...(parent_message_id ? { parentMessageId: parent_message_id } : {}),
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("[api/chat/messages] insert error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "GET method not implemented" });
}
