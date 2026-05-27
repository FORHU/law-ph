import { NextRequest, NextResponse } from 'next/server';

const SESSION_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(_request: NextRequest) {
  const apiUrl = (process.env.CHAT_WONDER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const sessionUrl = `${apiUrl}/session-id`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= SESSION_RETRIES; attempt++) {
    try {
      console.log(`[chat/session] Fetching session (attempt ${attempt}/${SESSION_RETRIES}):`, sessionUrl);

      const response = await fetch(sessionUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session ID: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data?.session_id) {
        throw new Error('Chat Wonder returned no session_id');
      }

      return NextResponse.json(data);
    } catch (error) {
      lastError = error;
      console.error(`[chat/session] Attempt ${attempt} failed:`, error);
      if (attempt < SESSION_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.error('[chat/session] All retries exhausted:', lastError);
  return NextResponse.json(
    { error: 'Could not initialize chat session. Chat Wonder may be unreachable.' },
    { status: 503 }
  );
}
