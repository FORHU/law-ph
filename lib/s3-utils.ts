import { S3_CONFIG } from './constants';

export interface UploadedDocumentData {
  filename: string;
  ai_summary: string;
  file_url: string;
  s3_key: string;
  url?: string;
  char_count?: number;
  truncated?: boolean;
}

/**
 * Uploads a file to S3 using a presigned URL and triggers backend analysis.
 * 
 * @param file The file to upload
 * @param apiUrl Context for API (e.g., process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')
 * @param analyze Whether to trigger backend analysis (default: true)
 * @returns Promise resolving to the uploaded document data
 */
export function formatS3Url(url: string | undefined | null): string {
  if (!url) return '';
  
  // Regex to match various S3 URL formats:
  // 1. https://bucket.s3.amazonaws.com/
  // 2. https://bucket.s3.region.amazonaws.com/
  const s3Regex = /https:\/\/[a-z0-9.-]+\.s3(\.[a-z0-9-]+)?\.amazonaws\.com\//i;
  
  if (s3Regex.test(url)) {
    return url.replace(s3Regex, S3_CONFIG.NEW_BASE_URL);
  }

  // Fallback for the explicit constant
  if (url.includes(S3_CONFIG.OLD_BASE_URL)) {
    return url.replace(S3_CONFIG.OLD_BASE_URL, S3_CONFIG.NEW_BASE_URL);
  }
  
  return url;
}

export async function uploadAndAnalyzeDocument(file: File, apiUrl?: string, analyze: boolean = true): Promise<UploadedDocumentData> {
  // Step 1: Get S3 presigned URL through proxy
  const urlResponse = await fetch(`/api/proxy/api/legal/document-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
    }),
  });

  const urlData = await urlResponse.json();
  if (!urlResponse.ok || !urlData.success) {
    throw new Error(urlData.detail || urlData.error || `Failed to get upload URL for ${file.name}`);
  }

  // Step 2: Upload file directly to S3 using PUT
  const s3Response = await fetch(urlData.url, {
    method: 'PUT',
    headers: { 'Content-Type': urlData.content_type },
    body: file,
  });

  if (!s3Response.ok && s3Response.status !== 204) {
    throw new Error(`Failed to upload ${file.name} to S3.`);
  }

  // Step 3: Determine final file URL
  // Prefer backend-provided file_url, fallback to base of signed upload URL
  const s3BaseUrl = urlData.url ? urlData.url.split('?')[0] : null;
  let defaultFileUrl = urlData.file_url || s3BaseUrl || `https://s3.amazonaws.com/${urlData.s3_key}`;

  // Apply CloudFront replacement if it's the specific law-ph S3 bucket
  if (defaultFileUrl.includes(S3_CONFIG.OLD_BASE_URL)) {
    defaultFileUrl = defaultFileUrl.replace(S3_CONFIG.OLD_BASE_URL, S3_CONFIG.NEW_BASE_URL);
  }

  // Step 3: Trigger backend analysis through proxy
  if (analyze) {
    const analyzeResponse = await fetch(`/api/proxy/api/legal/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        s3_key: urlData.s3_key,
        filename: file.name
      }),
    });

    const data = await analyzeResponse.json();
    if (!analyzeResponse.ok || !data.success) {
      console.warn(`Document analysis failed for ${file.name}, using default file URL and empty ai_summary.`, data);
      return {
        filename: file.name,
        ai_summary: "",
        file_url: formatS3Url(defaultFileUrl),
        s3_key: urlData.s3_key,
        url: urlData.url
      };
    }

    return {
      filename: file.name,
      ai_summary: data.ai_summary || "",
      file_url: formatS3Url(data.file_url || defaultFileUrl),
      s3_key: data.s3_key || urlData.s3_key,
      url: urlData.url,
      char_count: data.char_count,
      truncated: data.truncated,
    };
  }

  // If skipping analysis, return basic info with URL
  return {
    filename: file.name,
    ai_summary: "",
    file_url: formatS3Url(defaultFileUrl),
    s3_key: urlData.s3_key,
    url: urlData.url
  };
}

/**
 * Uploads a voice recording blob to S3.
 * 
 * @param blob The audio blob to upload
 * @param filename Optional filename
 * @returns Promise resolving to the uploaded document data
 */
export async function uploadVoiceNote(blob: Blob, filename?: string): Promise<{ file_url: string; s3_key: string }> {
  const name = filename || `recording-${Date.now()}.webm`;

  console.log(`[S3-Utils] Getting upload URL for voice note: ${name} (${blob.size} bytes)`);

  // Step 1: Get S3 presigned URL
  const urlResponse = await fetch(`/api/proxy/api/legal/document-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: name,
      content_type: blob.type || 'audio/webm',
    }),
  });

  const urlData = await urlResponse.json();
  if (!urlResponse.ok || !urlData.success) {
    console.error(`[S3-Utils] Failed to get upload URL:`, urlData);
    throw new Error(urlData.detail || urlData.error || `Failed to get upload URL for voice note`);
  }

  console.log(`[S3-Utils] Uploading blob to S3: ${urlData.url.substring(0, 50)}...`);

  // Step 2: Upload blob directly to S3
  const s3Response = await fetch(urlData.url, {
    method: 'PUT',
    headers: { 'Content-Type': urlData.content_type || 'audio/webm' },
    body: blob,
  });

  if (!s3Response.ok && s3Response.status !== 204) {
    const errorText = await s3Response.text();
    console.error(`[S3-Utils] S3 upload failed:`, errorText);
    throw new Error(`Failed to upload voice note to S3.`);
  }

  // Step 3: Determine final file URL
  // Extract the base S3 URL from the presigned upload URL (removes signature params)
  const s3BaseUrl = urlData.url ? urlData.url.split('?')[0] : null;
  let finalUrl = urlData.file_url || s3BaseUrl || `https://s3.amazonaws.com/${urlData.s3_key}`;

  // Apply CloudFront replacement if it's the specific law-ph S3 bucket
  if (finalUrl.includes(S3_CONFIG.OLD_BASE_URL)) {
    finalUrl = finalUrl.replace(S3_CONFIG.OLD_BASE_URL, S3_CONFIG.NEW_BASE_URL);
  }

  console.log(`[S3-Utils] Upload successful. Dynamic URL: ${finalUrl}`);
  return {
    file_url: formatS3Url(finalUrl),
    s3_key: urlData.s3_key
  };
}
