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
 * @returns Promise resolving to the uploaded document data
 */
export async function uploadAndAnalyzeDocument(file: File, apiUrl?: string): Promise<UploadedDocumentData> {
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  // Step 1: Get S3 presigned URL
  const urlResponse = await fetch(`${baseUrl}/api/legal/document-upload-url`, {
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

  // Step 3: Trigger backend analysis
  const analyzeResponse = await fetch(`${baseUrl}/api/legal/analyze-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      s3_key: urlData.s3_key,
      filename: file.name
    }),
  });

  const data = await analyzeResponse.json();
  if (!analyzeResponse.ok || !data.success) {
    throw new Error(data.detail || data.error || `Failed to analyze ${file.name}`);
  }

  return {
    filename: file.name,
    ai_summary: data.ai_summary,
    file_url: data.file_url,
    s3_key: data.s3_key,
    char_count: data.char_count,
    truncated: data.truncated,
  };
}
