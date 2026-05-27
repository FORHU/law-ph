import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();

  await prisma.message.updateMany({
    where: { id, conversation: { userId: user.id } },
    data: { content },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.message.deleteMany({
    where: { id, conversation: { userId: user.id } },
  });

  return NextResponse.json({ success: true });
}
