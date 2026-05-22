import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

  const isAudio = /\.(mp3|wav|webm|ogg|m4a)$/i.test(url);
  const audioCdn = (S3_CONFIG.AUDIO_CDN_URL || '').replace(/\/+$/, '');
  const generalCdn = (S3_CONFIG.CDN_URL || '').replace(/\/+$/, '');

  // Regex to match various S3 URL formats:
  const s3Regex = /https:\/\/[a-z0-9.-]+\.s3(\.[a-z0-9-]+)?\.amazonaws\.com\//i;

  if (s3Regex.test(url)) {
    const selectedCdn = isAudio ? (audioCdn || generalCdn) : generalCdn;
    return url.replace(s3Regex, (selectedCdn || '') + '/');
  }

  // Swap CloudFront domains if the wrong one is used for the file type
  if (isAudio && generalCdn && url.includes(generalCdn) && audioCdn && generalCdn !== audioCdn) {
    return url.replace(generalCdn, audioCdn);
  }
  
  if (!isAudio && audioCdn && url.includes(audioCdn) && generalCdn && generalCdn !== audioCdn) {
    return url.replace(audioCdn, generalCdn);
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

  // Step 2: Upload file through server-side proxy to avoid browser CORS restrictions on direct S3 PUT
  const s3Response = await fetch(`/api/s3-upload?filename=${encodeURIComponent(urlData.s3_key)}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!s3Response.ok) {
    const s3Err = await s3Response.json().catch(() => ({}));
    throw new Error(s3Err.error || `Failed to upload ${file.name} to S3.`);
  }

  // Step 3: Determine final file URL
  // Prefer backend-provided file_url, fallback to base of signed upload URL
  const s3BaseUrl = urlData.url ? urlData.url.split('?')[0] : null;
  const cdnBase = (S3_CONFIG.CDN_URL || '').replace(/\/+$/, '');
  const cdnUrl = cdnBase ? `${cdnBase}/` : '';

  const defaultFileUrl = urlData.s3_key
    ? `${cdnUrl}${urlData.s3_key}`
    : (urlData.file_url || s3BaseUrl || "");

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

  console.log(`[S3-Utils] Uploading voice note via direct S3 route: ${name} (${blob.size} bytes)`);

  // Use raw binary streams with query parameters instead of FormData to completely bypass
  // browser and framework-level multipart parsing size limitations and CORS issues.
  const response = await fetch(`/api/s3-upload?filename=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
    },
    body: blob,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    console.error(`[S3-Utils] Voice note upload failed:`, data.error);
    throw new Error(data.error || `Failed to upload voice note to S3. Status: ${response.status}`);
  }

  console.log(`[S3-Utils] Voice note upload successful: ${data.file_url}`);
  return {
    file_url: data.file_url,
    s3_key: data.s3_key
  };
}

/**
 * Uploads a file directly to a specified S3 bucket by proxying through a local API route.
 * This circumvents CORS issues caused by browsers directly connecting to strict S3 buckets.
 * 
 * @param blob The audio blob or file to upload
 * @param filename The destination filename/key in S3
 * @param bucket (Optional) The target bucket name
 * @returns Promise resolving to the uploaded media info
 */
export async function uploadToS3Direct(
  blob: Blob | File,
  filename: string,
  bucket?: string
): Promise<{ file_url: string; s3_key: string }> {
  const targetBucket = bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";

  console.log(`[S3-Direct] Uploading ${filename} to ${targetBucket} via local proxy API (${blob.size} bytes)`);

  try {
    const response = await fetch(`/api/s3-upload?filename=${encodeURIComponent(filename)}&bucket=${encodeURIComponent(targetBucket)}`, {
      method: "POST",
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
      },
      body: blob,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(`[S3-Direct] Proxy upload failed:`, data.error);
      throw new Error(data.error || `Failed to upload to S3. Status: ${response.status}`);
    }

    console.log(`[S3-Direct] Upload successful via proxy: ${data.file_url}`);

    return {
      file_url: data.file_url,
      s3_key: data.s3_key
    };
  } catch (error) {
    console.error("[S3-Direct] Upload sequence failed:", error);
    throw error;
  }
}

/**
 * Returns a proxied URL for an external resource to avoid CORS issues.
 * 
 * @param url The original external URL (e.g., S3 or CloudFront)
 * @returns The proxied URL
 */
export function getProxiedUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (!url.startsWith('http')) return url; // Already local or blob

  // Only proxy if it's an external AWS-related URL
  if (url.includes('cloudfront.net') || url.includes('amazonaws.com')) {
    return `/api/resource-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}
