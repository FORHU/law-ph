import { NextRequest, NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId = "Joanna" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: voiceId,
      Engine: "neural",
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new Error('Failed to generate audio stream');
    }

    // Convert stream to Buffer for NextResponse compatibility
    const audioArray = await response.AudioStream.transformToByteArray();
    const audioBuffer = Buffer.from(audioArray);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Polly API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
