import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  let conversations;
  if (search) {
    conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            messages: {
              some: {
                content: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  }

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title } = await req.json();

  if (id) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(id)) {
      return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
    }
  }

  const conversation = await prisma.conversation.create({
    data: { ...(id ? { id } : {}), userId: user.id, title: title || null },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
