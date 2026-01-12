import { NextRequest } from 'next/server';

// Use Edge Runtime for true streaming support
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_input, session_id } = body;

    if (!user_input || !session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_input or session_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the WebSocket URL from environment
    const apiUrl = process.env.CHAT_WONDER_API_URL || 'http://localhost:8001';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsEndpoint = `${wsUrl}/chat-stream`;

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
            session_id,
          };
          ws.send(JSON.stringify(payload));
        };

        // Handle incoming WebSocket messages
        ws.onmessage = (event) => {
          const message = event.data;
          
          // Forward the message to the client
          controller.enqueue(new TextEncoder().encode(message));
          
          // If this is the end signal, close the stream
          if (message === '__END__') {
            ws.close();
            closeStream();
          }
        };

        // Handle WebSocket errors
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          const errorMessage = '[Error] Connection error occurred';
          try {
            controller.enqueue(new TextEncoder().encode(errorMessage));
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
