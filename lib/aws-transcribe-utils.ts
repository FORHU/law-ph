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

  const ext = s3Uri.split('.').pop()?.toLowerCase();
  let mediaFormat: string | undefined = undefined;
  if (ext === 'mp3') mediaFormat = 'mp3';
  else if (ext === 'wav') mediaFormat = 'wav';
  else if (ext === 'flac') mediaFormat = 'flac';
  else if (ext === 'ogg') mediaFormat = 'ogg';
  else if (ext === 'webm' || ext === 'weba') mediaFormat = 'webm';
  else if (ext === 'm4a') mediaFormat = 'm4a';
  else if (ext === 'mp4') mediaFormat = 'mp4';
  else if (ext === 'amr') mediaFormat = 'amr';

  const params: any = {
    TranscriptionJobName: jobName,
    IdentifyLanguage: true,
    LanguageOptions: ["en-US", "tl-PH", "ko-KR"],
    Media: {
      MediaFileUri: s3Uri,
    },
    Settings: {
      ShowSpeakerLabels: true,
      MaxSpeakerLabels: 10,
    },
  };

  if (mediaFormat) {
    params.MediaFormat = mediaFormat;
  }

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
  if (!jobName) return null;
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

    // If speaker labels are not present, return simple transcript
    if (!data.results.speaker_labels || !data.results.speaker_labels.segments) {
      return data.results.transcripts[0].transcript || "";
    }

    // 1. Build a high-precision map of word start times to speaker labels
    const wordSpeakerMap = new Map<number, string>();
    data.results.speaker_labels.segments.forEach((seg: any) => {
      if (seg.items) {
        seg.items.forEach((item: any) => {
          if (item.start_time) {
            const t = parseFloat(item.start_time);
            if (!isNaN(t)) {
              wordSpeakerMap.set(t, seg.speaker_label);
            }
          }
        });
      }
    });

    const getSpeakerForTime = (startTime: number): string => {
      // Try precise word-level match with a tiny tolerance for floating point rounding
      for (const [t, spk] of wordSpeakerMap.entries()) {
        if (Math.abs(t - startTime) < 0.005) {
          return spk;
        }
      }

      // Fallback: search for a segment containing this start time
      const segments = data.results.speaker_labels.segments;
      for (const seg of segments) {
        const segStart = parseFloat(seg.start_time);
        const segEnd = parseFloat(seg.end_time);
        if (startTime >= segStart && startTime <= segEnd) {
          return seg.speaker_label;
        }
      }
      return "spk_0"; // default fallback
    };

    // 2. Iterate items sequentially to group into speaker turns
    const items = data.results.items;
    let fullTranscript = "";
    
    let currentSpeaker = "";
    let currentStartTime = 0;
    let currentBuffer: string[] = [];
    let lastWordEndTime = 0;

    items.forEach((item: any) => {
      const isPunctuation = item.type === "punctuation";
      const content = item.alternatives[0].content;

      if (isPunctuation) {
        currentBuffer.push(content);
      } else {
        const itemStart = parseFloat(item.start_time);
        const itemEnd = parseFloat(item.end_time);
        const speakerLabel = getSpeakerForTime(itemStart);
        const speaker = `Speaker ${speakerLabel.replace('spk_', '')}`;

        // Automatically split into a new timestamped block if:
        // 1. There is a conversational pause > 2.0 seconds OR
        // 2. The speaker changes OR
        // 3. We reached a natural paragraph boundary (previous sentence ended and we have 45+ words)
        const isPause = lastWordEndTime > 0 && (itemStart - lastWordEndTime) > 2.0;
        const lastChar = currentBuffer.length > 0 ? currentBuffer[currentBuffer.length - 1] : "";
        const endedSentence = lastChar === "." || lastChar === "?" || lastChar === "!";
        const isParagraphSplit = endedSentence && currentBuffer.length >= 45;

        const shouldSplit = (speaker !== currentSpeaker) || isPause || isParagraphSplit;

        if (currentSpeaker === "") {
          // First word
          currentSpeaker = speaker;
          currentStartTime = itemStart;
          currentBuffer.push(content);
        } else if (shouldSplit) {
          // Flush the previous turn
          let text = currentBuffer.join(" ").replace(/ ([,.!?;:])/g, "$1");
          text = text.charAt(0).toUpperCase() + text.slice(1);
          if (!/[.!?]$/.test(text)) text += ".";
          
          fullTranscript += `[TS:${currentStartTime.toFixed(2)}] [${currentSpeaker}]: ${text}\n\n`;

          // Start the new turn
          currentSpeaker = speaker;
          currentStartTime = itemStart;
          currentBuffer = [content];
        } else {
          // Same speaker
          currentBuffer.push(content);
        }

        lastWordEndTime = itemEnd;
      }
    });

    // Flush the final turn
    if (currentBuffer.length > 0) {
      let text = currentBuffer.join(" ").replace(/ ([,.!?;:])/g, "$1");
      text = text.charAt(0).toUpperCase() + text.slice(1);
      if (!/[.!?]$/.test(text)) text += ".";
      
      fullTranscript += `[TS:${currentStartTime.toFixed(2)}] [${currentSpeaker}]: ${text}\n\n`;
    }

    return fullTranscript.trim() || data.results.transcripts[0].transcript || "";
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
    IdentifyLanguage: true,
    LanguageOptions: "en-US,tl-PH,ko-KR",
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
