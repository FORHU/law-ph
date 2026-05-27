import { prisma } from "@/lib/prisma";

export interface Transcription {
  id: string;
  userId: string;
  title: string | null;
  audioUrl: string | null;
  transcript: string | null;
  duration: number | null;
  jobName: string | null;
  createdAt: Date;
}

export async function getTranscriptions(userId: string): Promise<Transcription[]> {
  try {
    return await prisma.transcription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[transcriptions-service] getTranscriptions error:", err);
    return [];
  }
}

export async function addTranscription(
  userId: string,
  transcription: Partial<Omit<Transcription, "id" | "userId" | "createdAt">>
): Promise<Transcription | null> {
  try {
    return await prisma.transcription.create({
      data: {
        userId,
        title: transcription.title || "Untitled Transcription",
        audioUrl: transcription.audioUrl ?? null,
        transcript: transcription.transcript ?? null,
        duration: transcription.duration ?? null,
        jobName: transcription.jobName ?? null,
      },
    });
  } catch (err) {
    console.error("[transcriptions-service] addTranscription error:", err);
    return null;
  }
}

export async function updateTranscription(
  id: string,
  updates: Partial<Omit<Transcription, "id" | "userId" | "createdAt">>
): Promise<Transcription | null> {
  try {
    return await prisma.transcription.update({
      where: { id },
      data: updates,
    });
  } catch (err) {
    console.error("[transcriptions-service] updateTranscription error:", err);
    return null;
  }
}

export async function deleteTranscription(id: string): Promise<boolean> {
  try {
    await prisma.transcription.delete({ where: { id } });
    return true;
  } catch (err) {
    console.error("[transcriptions-service] deleteTranscription error:", err);
    return false;
  }
}
