import { 
  TranscribeClient, 
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand 
} from "@aws-sdk/client-transcribe";
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { getProxiedUrl } from "./s3-utils";

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
    MediaFormat: "mp3", 
    Media: {
      MediaFileUri: s3Uri,
    },
    Settings: {
      ShowSpeakerLabels: true,
      MaxSpeakerLabels: 2,
    },
  };

  try {
    const data = await client.send(new StartTranscriptionJobCommand(params as any));
    console.log("Success - Transcription job initiated.", data);
    return data;
  } catch (err: any) {
    console.warn("AWS Transcribe Error:", err.message || "Access Denied");
    return null;
  }
}

/**
 * Get the status of a transcription job.
 */
export async function getTranscriptionJobStatus(jobName: string) {
  const client = new TranscribeClient({
    region: AWS_REGION,
    credentials: getCredentials(),
  });

  try {
    const data = await client.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
    return data.TranscriptionJob;
  } catch (err) {
    console.error("Error getting transcription job status", err);
    return null;
  }
}

/**
 * Fetch the transcript and parse speaker labels if available.
 * Returns a string formatted with Speaker identifiers if data is present.
 */
export async function fetchTranscriptionText(url: string): Promise<string> {
    try {
        const proxiedUrl = getProxiedUrl(url);
        const response = await fetch(proxiedUrl);
        const data = await response.json();
        
        if (!data.results) return "";

        // Fallback to simple transcript if speaker labels are missing
        if (!data.results.speaker_labels || !data.results.speaker_labels.segments) {
            return data.results.transcripts?.[0]?.transcript || "";
        }

        const items = data.results.items;
        const segments = data.results.speaker_labels.segments;
        
        // Fast speaker lookup using cached segment index (since items are chronological)
        let segmentIndex = 0;
        const getSpeakerAtTime = (timeStr: string) => {
            const time = parseFloat(timeStr);
            for (let i = segmentIndex; i < segments.length; i++) {
                const s = segments[i];
                const start = parseFloat(s.start_time);
                const end = parseFloat(s.end_time);
                if (start <= time && end >= time) {
                    segmentIndex = i;
                    return `Speaker ${s.speaker_label.replace('spk_', '')}`;
                }
            }
            return null;
        };

        let currentSpeaker: string | null = null;
        let fullTranscript = "";
        let currentSpeakerSentence = "";

        items.forEach((item: any) => {
            const content = item.alternatives[0].content;
            let itemSpeaker: string | null = null;

            if (item.start_time) {
                // Word item - find which speaker segment it falls into
                itemSpeaker = getSpeakerAtTime(item.start_time);
            }

            // If we found a speaker, or if this is punctuation (use current active speaker)
            if (itemSpeaker && itemSpeaker !== currentSpeaker) {
                // Speaker transition detected
                if (currentSpeaker !== null && currentSpeakerSentence.trim()) {
                    fullTranscript += `[${currentSpeaker}]: ${currentSpeakerSentence.trim()}\n\n`;
                }
                currentSpeaker = itemSpeaker;
                currentSpeakerSentence = content;
            } else {
                // Continue with current speaker block
                if (item.type === "punctuation") {
                    currentSpeakerSentence += content;
                } else {
                    // Add space before words, but not at the start of a block
                    currentSpeakerSentence += (currentSpeakerSentence ? " " : "") + content;
                }
            }
        });

        // Add the final speaker block
        if (currentSpeaker !== null && currentSpeakerSentence.trim()) {
            fullTranscript += `[${currentSpeaker}]: ${currentSpeakerSentence.trim()}\n\n`;
        }

        // Return the reconstructed transcript or fallback to raw text
        return fullTranscript.trim() || data.results.transcripts?.[0]?.transcript || "";
    } catch (err) {
        console.error("Error fetching/parsing transcript from S3", err);
        return "";
    }
}

/**
 * Placeholder generator for audio stream chunks to be fed to AWS Transcribe Streaming.
 */
async function* getAudioStream(audioChunks: AsyncGenerator<Uint8Array>) {
  for await (const chunk of audioChunks) {
    yield { AudioEvent: { AudioChunk: chunk } };
  }
}

/**
 * Starts a live streaming transcription session.
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
    AudioStream: getAudioStream(audioChunks) as any,
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
