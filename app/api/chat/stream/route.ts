import { NextRequest } from 'next/server';

// Use Node runtime to avoid Edge buffering the first chunk (which can drop disclaimer + Bottom line on Vercel)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEGAL_TAG = '[legal ai]';

/** Strip any existing legal persona tag; proxy adds the canonical tag at the boundary. */
function stripLegalTag(input: string): string {
  const lower = input.toLowerCase();
  if (!lower.startsWith(LEGAL_TAG)) return input;
  return input.slice(LEGAL_TAG.length).trimStart();
}

function withLegalTag(input: string): string {
  return `${LEGAL_TAG} ${stripLegalTag(input)}`;
}

function stripSources(chunk: string): string {
  const idx = chunk.indexOf('[Sources]');
  return idx !== -1 ? chunk.slice(0, idx) : chunk;
}

const RELATED_QUERIES_RULE = `

At the end of your response, output this tag:

[RELATED_QUERIES]["term1","term2","term3"][/RELATED_QUERIES]

Rules for the terms — prioritize in this order:
1. EXACT law/statute names and numbers you cited (e.g. "Presidential Decree 603", "Republic Act 9262", "Family Code of the Philippines")
2. EXACT article or section numbers from those laws (e.g. "Article 209", "Section 10", "Article 256")
3. EXACT case names or GR numbers if you referenced jurisprudence (e.g. "GR No. 123456", "People v. Genosa")
4. Only if no specific laws or cases were cited: short, precise legal concepts directly relevant to the question (1-3 words max)
5. If the question is not about Philippine law, output an empty array: [RELATED_QUERIES][][/RELATED_QUERIES]

Additional rules:
- 5 to 8 terms maximum, each DISTINCT
- Prefer terms that appear verbatim in Philippine legal document titles — these match the database best
- Exclude generic topic words like "legal rights", "social services", "emergency shelters" unless they are actual law titles
- Bad: ["parental authority","child welfare","runaway minor","social services","legal rights minors"] — vague topic words
- Good: ["Presidential Decree 603","Family Code","Article 209","Republic Act 7610","DSWD"] — actual law names

CRITICAL: NEVER mention "Related Queries" in your prose. Output only the tag at the very bottom, after all text.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_input, session_id, document_context } = body;

    if (!user_input) {
      return new Response(
        JSON.stringify({ error: 'Missing user_input' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id. Initialize via GET /api/chat/session first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = (process.env.CHAT_WONDER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsEndpoint = `${wsUrl}/chat-stream`;
    console.log('[chat/stream] Connecting WebSocket to:', wsEndpoint);

    let streamClosed = false;
    let wsClosed = false;
    let ws: WebSocket | null = null;
    let sourcesDropped = false;

    const closeWebSocket = () => {
      if (wsClosed || !ws) return;
      wsClosed = true;
      try {
        ws.close();
      } catch {
        // Already closing
      }
    };

    const stream = new ReadableStream({
      start(controller) {
        ws = new WebSocket(wsEndpoint);

        const closeStream = () => {
          if (streamClosed) return;
          streamClosed = true;
          closeWebSocket();
          try {
            controller.close();
          } catch {
            // Consumer may have already closed/cancelled the stream
          }
        };

        const safeEnqueue = (text: string) => {
          if (streamClosed) return;
          try {
            controller.enqueue(new TextEncoder().encode(text));
          } catch {
            streamClosed = true;
            closeWebSocket();
          }
        };

        const handleEnd = () => {
          closeStream();
        };

        ws.onopen = () => {
          console.log('[chat/stream] WebSocket connected to chat-wonder');

          const payload: {
            type: string;
            user_input: string;
            session_id: string;
            use_full_legal_chain: boolean;
            document_context?: string;
          } = {
            type: 'chat',
            user_input: withLegalTag(user_input) + RELATED_QUERIES_RULE,
            session_id,
            use_full_legal_chain: false,
          };
          if (document_context) {
            payload.document_context = document_context;
          }
          ws!.send(JSON.stringify(payload));
        };

        ws.onmessage = (event) => {
          if (streamClosed) return;

          const message = typeof event.data === 'string' ? event.data : String(event.data);

          if (message === '__END__') {
            handleEnd();
            return;
          }

          if (message.endsWith('__END__')) {
            const content = message.slice(0, -'__END__'.length);
            if (content) safeEnqueue(stripSources(content));
            handleEnd();
            return;
          }

          if (sourcesDropped) return;

          const idx = message.indexOf('[Sources]');
          if (idx !== -1) {
            sourcesDropped = true;
            if (idx > 0) safeEnqueue(message.slice(0, idx));
            return;
          }

          safeEnqueue(message);
        };

        ws.onerror = (error) => {
          if (streamClosed) return;
          console.error('[chat/stream] WebSocket error:', error);
          safeEnqueue('[Error] Connection error occurred');
          closeStream();
        };

        ws.onclose = () => {
          console.log('[chat/stream] WebSocket closed');
          closeStream();
        };
      },
      cancel() {
        // Fetch aborted (navigation, AbortController) — stop WS without enqueue errors
        streamClosed = true;
        closeWebSocket();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}