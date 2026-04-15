import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-1";
const getCredentials = () => {
  return {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY || "",
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "",
  };
};

/**
 * Start a batch transcription job for an audio file already stored in S3.
 * @param s3Uri S3 URI of the file (e.g. s3://bucket/key)
 * @param jobName Unique name for the transcription job
 */
export async function startAWSBatchTranscription(s3Uri: string, jobName: string) {
  const client = new TranscribeClient({
    region: AWS_REGION,
    credentials: getCredentials(),
  });

  const params = {
    TranscriptionJobName: jobName,
    LanguageCode: "en-US",
    MediaFormat: "mp3", // Adjust based on upload format
    Media: {
      MediaFileUri: s3Uri,
    },
    // OutputBucketName: "your-output-bucket", // Optional if you want explicit output location
  };

  try {
    const data = await client.send(new StartTranscriptionJobCommand(params));
    console.log("Success - Transcription job initiated.", data);
    return data;
  } catch (err: any) {
    console.warn("AWS Transcribe Error:", err.message || "Access Denied");
    return null;
  }
}

/**
 * Placeholder generator for audio stream chunks to be fed to AWS Transcribe Streaming.
 * In practice, you pipe a MediaRecorder or an AudioContext processor here.
 */
async function* getAudioStream(audioChunks: AsyncGenerator<Uint8Array>) {
  for await (const chunk of audioChunks) {
    yield { AudioEvent: { AudioChunk: chunk } };
  }
}

/**
 * Starts a live streaming transcription session.
 * @param audioChunks An async generator yielding Uint8Array PCM audio data chunks
 * @param onTranscript Callback invoked when new text is transcribed
 */
export async function startAWSLiveTranscription(
  audioChunks: AsyncGenerator<Uint8Array>,
  onTranscript: (text: string, isPartial: boolean) => void
) {
  const client = new TranscribeStreamingClient({
    region: AWS_REGION,
    credentials: getCredentials(),
  });

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: "en-US",
    MediaEncoding: "pcm",
    MediaSampleRateHertz: 16000,
    AudioStream: getAudioStream(audioChunks) as any, // TypeScript expects specific AsyncIterable typing
  });

  try {
    const response = await client.send(command);
    if (!response.TranscriptResultStream) {
      throw new Error("No transcript result stream in response.");
    }

    for await (const event of response.TranscriptResultStream) {
      if (event.TranscriptEvent?.Transcript?.Results) {
        for (const result of event.TranscriptEvent.Transcript.Results) {
           const text = result.Alternatives?.[0]?.Transcript;
           if (text) {
             onTranscript(text, result.IsPartial || false);
           }
        }
      }
    }
  } catch (err) {
    console.error("Error with live transcription", err);
    throw err;
  }
}
