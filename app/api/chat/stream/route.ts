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
            user_input: withLegalTag(user_input),
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
            if (content) safeEnqueue(content);
            handleEnd();
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
