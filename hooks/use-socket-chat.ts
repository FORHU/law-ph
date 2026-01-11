import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
  imagePreview?: string;
}

interface SocketChatOptions {
  url: string;
  apiUrl?: string;
  onMessageReceived?: (message: string) => void;
  onStreamComplete?: () => void;
  onError?: (error: string) => void;
}

export function useSocketChat({ url, apiUrl, onMessageReceived, onStreamComplete, onError }: SocketChatOptions) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Kumusta! I am your LexPH workspace. You can ask me legal questions, find nearby legal aid, or upload a document for me to review.",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use a ref to track loading state inside callbacks without triggering re-renders/dependency changes
  const isLoadingRef = useRef(false);
  
  const [sessionId, setSessionId] = useState<string>('');
  
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize session ID from API
  useEffect(() => {
    const fetchSessionWithRetry = async (retries = 3) => {
        if (sessionId) return; // Prevent re-fetching if already set
        try {
            const baseUrl = apiUrl || "http://localhost:8001";
            const res = await fetch(`${baseUrl}/session-id`);
            if (!res.ok) throw new Error("Failed to fetch session ID");
            const data = await res.json();
            setSessionId(data.session_id);
            console.log("Session initialized:", data.session_id);
        } catch (err) {
            console.error("Session fetch error:", err);
            if (retries > 0) {
                setTimeout(() => fetchSessionWithRetry(retries - 1), 1000);
            } else if (onError) {
                onError("Failed to initialize session. Please check connection.");
            }
        }
    };

    fetchSessionWithRetry();
  }, [apiUrl, onError]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    if (!sessionId) return; // Don't connect without session

    try {
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        console.log('Connected to chat socket');
      };

      socket.onmessage = (event) => {
        const data = event.data;
        
        if (data === "__END__") {
          setIsLoading(false);
          isLoadingRef.current = false;
          if (onStreamComplete) onStreamComplete();
        } else if (data.startsWith("[Error]")) {
          setIsLoading(false);
          isLoadingRef.current = false;
          if (onError) onError(data);
          // Add error message to chat
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${data}`,
            timestamp: new Date()
          }]);
        } else {
          // Streaming text chunk
          // Update the last message if it's from assistant, or create new one
          setMessages(currentMessages => {
            const lastMsg = currentMessages[currentMessages.length - 1];
            
            // Allow update if we are marked as loading OR if the last message is empty (start of stream)
            // But checking isLoadingRef alone is safest for stream continuity
            if (lastMsg && lastMsg.role === 'assistant' && isLoadingRef.current) {
              // Update existing assistant message being streamed
              const updatedMessages = [...currentMessages];
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + data
              };
              return updatedMessages;
            } else {
               // Should have been created when sending, but if not:
               return [...currentMessages, {
                 role: 'assistant',
                 content: data,
                 timestamp: new Date()
               }];
            }
          });
          
          if (onMessageReceived) onMessageReceived(data);
        }
      };

      socket.onerror = (error) => {
        console.error("Socket error", error);
        setIsLoading(false);
        isLoadingRef.current = false;
        if (onError) onError("Connection error occurred.");
      };

      socket.onclose = () => {
        console.log("Socket closed");
      };

      socketRef.current = socket;
    } catch (err) {
      console.error("Failed to connect", err);
      if (onError) onError("Failed to connect to chat server.");
    }
  }, [url, sessionId, onMessageReceived, onStreamComplete, onError]); // Removed isLoading from deps

  // Connect when session is ready
  useEffect(() => {
    if (sessionId) {
        connect();
    }
    return () => {
      socketRef.current?.close();
    };
  }, [sessionId, connect]);

  const sendMessage = useCallback((text: string, image?: string) => {
    if (!text.trim() && !image) return;
    if (!sessionId) {
        if(onError) onError("Initializing session... please wait.");
        return;
    }
    
    // Add user message immediately
    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
      imagePreview: image // Passthrough but ignored by backend for now
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    isLoadingRef.current = true;
    
    // Create placeholder assistant message that will be updated
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '', // Start empty
      timestamp: new Date()
    }]);

    // Ensure socket is open
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
        connect();
        setTimeout(() => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                sendPayload(text);
            } else {
                setIsLoading(false);
                isLoadingRef.current = false;
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "Connection failed. Please try again.",
                    timestamp: new Date()
                }]);
            }
        }, 1000);
    } else {
        sendPayload(text);
    }

    function sendPayload(inputText: string) {
        if (!socketRef.current) return;
        
        const payload = {
            user_input: `[Legal AI] ${inputText}`,
            session_id: sessionId
            // Image support not yet in backend socket
        };
        socketRef.current.send(JSON.stringify(payload));
    }

  }, [sessionId, connect, onError]);

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    sessionId
  };
}
