export interface UploadedDocumentData {
  filename: string;
  ai_summary: string;
  file_url: string;
  s3_key: string;
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

  // Determine final file URL: prefer backend analysis URL, fallback to signed URL metadata
  const defaultFileUrl = urlData.file_url || `https://law-ph.s3.amazonaws.com/${urlData.s3_key}`;

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
        file_url: defaultFileUrl,
        s3_key: urlData.s3_key,
      };
    }

    return {
      filename: file.name,
      ai_summary: data.ai_summary || "",
      file_url: data.file_url || defaultFileUrl,
      s3_key: data.s3_key || urlData.s3_key,
      char_count: data.char_count,
      truncated: data.truncated,
    };
  }

  // If skipping analysis, return basic info with URL
  return {
    filename: file.name,
    ai_summary: "",
    file_url: defaultFileUrl,
    s3_key: urlData.s3_key,
  };
}

/**
 * Uploads a voice recording blob to S3.
 * 
 * @param blob The audio blob to upload
 * @param filename Optional filename
 * @returns Promise resolving to the permanent file URL
 */
export async function uploadVoiceNote(blob: Blob, filename?: string): Promise<string> {
  const name = filename || `recording-${Date.now()}.webm`;
  
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
    throw new Error(urlData.detail || urlData.error || `Failed to get upload URL for voice note`);
  }

  // Step 2: Upload blob directly to S3
  const s3Response = await fetch(urlData.url, {
    method: 'PUT',
    headers: { 'Content-Type': urlData.content_type },
    body: blob,
  });

  if (!s3Response.ok && s3Response.status !== 204) {
    throw new Error(`Failed to upload voice note to S3.`);
  }

  return urlData.file_url;
}
