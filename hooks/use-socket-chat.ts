import { useConversations } from '@/components/conversation-provider';
import { useState, useRef, useEffect, useCallback } from 'react';
import useSaveMessage from './use-save-message';
import { Message } from '@/types';

// Extended for local state needs
interface SocketMessage extends Message {
  sources?: any[];
  imagePreview?: string;
}

interface SocketChatOptions {
  onMessageReceived?: (message: string) => void;
  onStreamComplete?: () => void;
  onError?: (error: string) => void;
}

export function useSocketChat({ onMessageReceived, onStreamComplete, onError }: SocketChatOptions) {

  const { messages, setMessages } = useConversations()
  const [isLoading, setIsLoading] = useState(false);

  const { saveMessageToDB } = useSaveMessage()
  
  // Use a ref to track loading state inside callbacks without triggering re-renders/dependency changes
  const isLoadingRef = useRef(false);
  
  const [sessionId, setSessionId] = useState<string>('');
  
  // Ref to store abort controller for cancelling streams
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize session ID from API
  useEffect(() => {
    const fetchSessionWithRetry = async (retries = 3) => {
        if (sessionId) return; // Prevent re-fetching if already set
        try {
            const res = await fetch('/api/chat/session');
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
  }, [onError, sessionId]);

  const sendMessage = useCallback(async (text: string, image?: string, conversation_id?: string) => {
    if (!text.trim() && !image) return;
    if (!sessionId) {
        if(onError) onError("Initializing session... please wait.");
        return;
    }
    
    // Add user message immediately
    const userMsg: SocketMessage = {
      role: 'user',
      content: text,
      created_at: new Date(),
      imagePreview: image // Passthrough but ignored by backend for now
    };
    
    setMessages(prev => [...prev, userMsg]);
    saveMessageToDB({...userMsg, conversation_id});
    setIsLoading(true);
    isLoadingRef.current = true;
    
    // Create placeholder assistant message that will be updated
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '', // Start empty
      created_at: new Date()
    }]);

    let accumulatedContent = '';


    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: `[Legal AI] ${text}`,
          session_id: sessionId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      // Read the stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          let chunk = decoder.decode(value, { stream: true });

          // Strip END marker, don’t skip content
          if (chunk.includes("__END__")) {
            chunk = chunk.replace("__END__", "");
          }

          if (chunk.startsWith("[Error]")) {
            if (chunk.includes("Unknown session")) {
              localStorage.removeItem('chat_session_id');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
            if (onError) onError(chunk);
            break;
          }

          if (chunk.startsWith("[Tool]")) continue;

          if (!chunk) continue;

          accumulatedContent += chunk;

          setMessages(currentMessages => {
            const lastMsg = currentMessages[currentMessages.length - 1];
            if (lastMsg?.role === 'assistant') {
              const updated = [...currentMessages];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: accumulatedContent,
              };
              return updated;
            }
            return currentMessages;
          });

          if (onMessageReceived) onMessageReceived(chunk);
        }


      setIsLoading(false);
      isLoadingRef.current = false;

      saveMessageToDB({
        role: 'assistant',
        content: accumulatedContent,
        conversation_id,
      });

if (onStreamComplete) onStreamComplete();

    } catch (err: any) {
      console.error("Stream error:", err);
      setIsLoading(false);
      isLoadingRef.current = false;
      
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        if (onError) onError("Failed to send message. Please try again.");
        // Update the last message with error
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "Connection failed. Please try again."
          };
          return updated;
        });
      }
    }
  }, [sessionId, onMessageReceived, onStreamComplete, onError]);

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    sessionId
  };
}
