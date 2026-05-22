import { NextRequest } from 'next/server';

// Use Node runtime to avoid Edge buffering the first chunk (which can drop disclaimer + Bottom line on Vercel)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_input, session_id, document_context, google_access_token } = body;

    if (!user_input) {
      return new Response(
        JSON.stringify({ error: 'Missing user_input' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const effectiveSessionId = session_id || `local-${Date.now()}`;

    // Get the WebSocket URL from environment
    const apiUrl = (process.env.CHAT_WONDER_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsEndpoint = `${wsUrl}/chat-stream`;
    console.log('[chat/stream] Connecting WebSocket to:', wsEndpoint);

    // Create a readable stream that will proxy the WebSocket messages
    const stream = new ReadableStream({
      async start(controller) {
        const ws = new WebSocket(wsEndpoint);
        let isClosed = false;

        const closeStream = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (err) {
              // Controller already closed, ignore
            }
          }
        };

        // Handle WebSocket connection open
        ws.onopen = () => {
          console.log('WebSocket connected to chat-wonder-api');

          // Send the chat message
          const payload = {
            user_input,
            session_id: effectiveSessionId,
            document_context,
            google_access_token,
          };
          ws.send(JSON.stringify(payload));
        };

        // Handle incoming WebSocket messages
        ws.onmessage = (event) => {
          if (isClosed) return;

          const message = event.data;

          try {
            if (message === '__END__') {
              // End sentinel — close cleanly, don't forward to the client
              ws.close();
              closeStream();
            } else {
              controller.enqueue(new TextEncoder().encode(message));
            }
          } catch (err) {
            console.error('Streaming enqueue error:', err);
            isClosed = true;
          }
        };

        // Handle WebSocket errors
        ws.onerror = (error) => {
          if (isClosed) return;
          console.error('WebSocket error:', error);
          const errorMessage = '[Error] Connection error occurred';
          try {
            if (!isClosed) {
              controller.enqueue(new TextEncoder().encode(errorMessage));
            }
          } catch (err) {
            // Controller already closed
          }
          closeStream();
        };

        // Handle WebSocket close
        ws.onclose = () => {
          console.log('WebSocket closed');
          closeStream();
        };
      },
    });

    // Return the streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
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