import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getTranscriptions, addTranscription } from "@/lib/transcriptions-service";

export async function GET() {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const transcriptions = await getTranscriptions(user.id);
  return NextResponse.json({ transcriptions });
}

export async function POST(request: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const transcription = await addTranscription(user.id, body);
  if (!transcription) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ transcription });
}
