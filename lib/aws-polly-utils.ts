/**
 * Secure Polly Utility
 */

/**
 * Synthesize text into speech using our secure server-side Polly API.
 * Falls back to Browser TTS only.
 * @param text The text to convert to speech
 * @param voiceId The Polly Voice ID to use (default: Joanna)
 * @returns An Audio object that can be played
 */
export async function synthesizeSpeech(text: string, voiceId: string = "Joanna"): Promise<HTMLAudioElement | null> {
  // Clean the text to remove any remaining markdown/metadata tags
  const cleanText = text
    .replace(/\[MINDMAP\][\s\S]*?\[\/MINDMAP\]/gi, '')
    .replace(/\[TIMELINE\][\s\S]*?\[\/TIMELINE\]/gi, '')
    .replace(/\[ILM_META\][\s\S]*?\[\/ILM_META\]/gi, '')
    .replace(/\*+/g, '')
    .replace(/##/g, '')
    .trim();

  if (!cleanText) return null;

  try {
    // 1. Try Professional AWS Polly (Main)
    const response = await fetch('/api/tts/polly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, voiceId }),
    });

    if (response.ok) {
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      return new Audio(url);
    }

    throw new Error(`Polly API failed with status ${response.status}`);
  } catch (err) {
    console.error("Polly Error:", err);
    // Let caller handle browser TTS fallback
    return null;
  }
}
