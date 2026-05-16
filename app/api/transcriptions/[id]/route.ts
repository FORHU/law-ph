import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { updateTranscription, deleteTranscription } from "@/lib/transcriptions-service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const transcription = await updateTranscription(id, body);
  return NextResponse.json({ transcription });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteTranscription(id);
  return NextResponse.json({ ok });
}
