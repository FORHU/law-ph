import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documents } = await req.json();
  if (!Array.isArray(documents) || documents.length === 0) {
    return NextResponse.json({ error: "documents array required" }, { status: 400 });
  }

  const created = await prisma.userDocument.createMany({
    data: documents.map((d: any) => ({
      id: d.id || undefined,
      userId: user.id,
      name: d.name,
      caseId: d.case_id || null,
      fileUrl: d.file_url || null,
      s3Key: d.s3_key || null,
      aiSummary: d.ai_summary || null,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}

export async function GET() {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.userDocument.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}
