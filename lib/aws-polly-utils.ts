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
export async function synthesizeSpeech(text: string, voiceId: string = "Ruth"): Promise<HTMLAudioElement | null> {
  // Clean the text to remove any remaining markdown/metadata tags
  const cleanText = text
    .replace(/\[MINDMAP\][\s\S]*?\[\/MINDMAP\]/gi, '')
    .replace(/\[TIMELINE\][\s\S]*?\[\/TIMELINE\]/gi, '')
    .replace(/\[ILM_META\][\s\S]*?\[\/ILM_META\]/gi, '')
    // Remove markdown images entirely
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Convert markdown links to just the text: [Link Text](https://...) -> Link Text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown headers
    .replace(/#+\s*/g, '')
    // Remove bold/italic markers, backticks, and tildes
    .replace(/[*_`~]/g, '')
    // Remove double quotes
    .replace(/"/g, '')
    // Remove greater-than and less-than signs (e.g. from blockquotes `> `)
    .replace(/[<>]/g, '')
    // Fix legal abbreviations and terms for proper pronunciation
    .replace(/\bSec\./gi, 'Section')
    .replace(/(Republic Act|R\.?A\.?)\s+(\d+)/gi, (match, prefix, digits) => `${prefix} ${digits.split('').join(' ')}`)
    // Replace colons and slashes with commas for natural pausing
    .replace(/:/g, ',')
    .replace(/[\\/]/g, ', ')
    // Format list letters (e.g. "A. ") to "A, " to avoid "dot" being spoken
    .replace(/^([A-Z])\.\s+/gm, '$1, ')
    // Remove bullet points (dashes, dots) at the start of lines
    .replace(/^[\s]*[-•]\s+/gm, '')
    // Fix Philippine legal abbreviations
    .replace(/\bG\.R\.?\s*No\.?/gi, 'G R Number')
    .replace(/\bB\.P\.?\b/gi, 'Batas Pambansa')
    .replace(/\bP\.D\.?\b/gi, 'Presidential Decree')
    .replace(/\bE\.O\.?\b/gi, 'Executive Order')
    .replace(/\bA\.M\.?\s*No\.?/gi, 'A M Number')
    .replace(/\bA\.C\.?\s*No\.?/gi, 'A C Number')
    .replace(/\bArt\.\b/gi, 'Article')
    .replace(/\bArts\.\b/gi, 'Articles')
    .replace(/\bPar\.\b/gi, 'Paragraph')
    .replace(/\s+v\.?\s+/gi, ' versus ')
    .replace(/\s+vs\.?\s+/gi, ' versus ')
    // Fix Latin/Spanish legal term pronunciations
    .replace(/\bcertiorari\b/gi, 'sir-shee-or-ah-ree')
    .replace(/\bprima facie\b/gi, 'pry-mah fay-shee')
    .replace(/\ben banc\b/gi, 'en bank')
    .replace(/\bhabeas corpus\b/gi, 'hay-bee-us kor-pus')
    .replace(/\bres judicata\b/gi, 'rez joo-dih-kah-tah')
    .replace(/\bamicus curiae\b/gi, 'uh-mee-kus kyoor-ee-eye')
    .replace(/\bstare decisis\b/gi, 'stah-ree deh-sy-sis')
    .replace(/\bsubpoena\b/gi, 'sub-pee-nuh')
    .replace(/\breclusion perpetua\b/gi, 'reclusion per-pet-wah')
    .replace(/\baccion reivindicatoria\b/gi, 'ak-shon ray-vin-dee-kah-tor-yah')
    .replace(/\baccion publiciana\b/gi, 'ak-shon poob-lee-shah-nah')
    .replace(/\baccion interdictal\b/gi, 'ak-shon in-ter-dik-tal')
    // Fix Philippine-specific terms, agencies, and Tagalog words
    .replace(/\bBarangay\b/gi, 'bah-rang-guy')
    .replace(/\bSandiganbayan\b/gi, 'san-dee-gan-bah-yan')
    .replace(/\bSangguniang\b/gi, 'sang-goo-nee-ang')
    .replace(/\bKatarungang\b/gi, 'kah-tah-roo-ngang')
    .replace(/\bPambarangay\b/gi, 'pam-bah-rang-guy')
    .replace(/\bLupon\b/gi, 'loo-pon')
    .replace(/\bTagapamayapa\b/gi, 'tah-gah-pah-mah-yah-pah')
    .replace(/\bBatas Pambansa\b/gi, 'bah-tas pam-ban-sah')
    .replace(/\bComelec\b/gi, 'ko-me-lek')
    .replace(/\bQuezon\b/gi, 'keh-zon')
    .replace(/\bPoblacion\b/gi, 'pob-lah-shon')
    .replace(/\bng\b/g, 'nang') // Important Tagalog particle
    .replace(/\bmga\b/gi, 'mah-ngah') // Important Tagalog plural marker
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
