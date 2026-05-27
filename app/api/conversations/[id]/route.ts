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

  await prisma.conversation.deleteMany({ where: { id, userId: user.id } });

  return NextResponse.json({ success: true });
}
