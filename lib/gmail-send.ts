import { refreshGoogleAccessToken } from './google-token';

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

// RFC 2822 messages must be base64url-encoded (no padding, - instead of +, _ instead of /)
function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string; // e.g. "text/calendar; method=REQUEST"
}

interface MimeParams {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: Attachment[];
}

function buildMimeMessage({ from, to, subject, html, attachments }: MimeParams): string {
  const hasAttachments = attachments && attachments.length > 0;
  const boundary = `__boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headers = [
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${subject}`,
  ];

  if (!hasAttachments) {
    return [
      ...headers,
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
    ].join('\r\n');
  }

  const parts: string[] = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf-8').toString('base64'),
  ];

  for (const att of attachments!) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${att.contentType}; name="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename}"`,
      '',
      att.content.toString('base64'),
    );
  }

  parts.push(`--${boundary}--`);
  return parts.join('\r\n');
}

export interface GmailSendParams extends MimeParams {
  accessToken: string;
  refreshToken?: string;
}

export async function sendViaGmail({
  accessToken,
  refreshToken,
  ...mimeParams
}: GmailSendParams): Promise<{ data: any; error: Error | null }> {
  const raw = base64url(buildMimeMessage(mimeParams));

  const post = (token: string) =>
    fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

  let res = await post(accessToken);

  // Token may be expired — try to refresh once
  if (res.status === 401 && refreshToken) {
    const newToken = await refreshGoogleAccessToken(refreshToken);
    if (newToken) {
      res = await post(newToken);
    }
  }

  if (!res.ok) {
    const body = await res.text();
    return { data: null, error: new Error(`Gmail API ${res.status}: ${body}`) };
  }

  return { data: await res.json(), error: null };
}
