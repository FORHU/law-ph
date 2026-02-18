import { useState, useEffect } from 'react';

export function useChatSession() {
  const [chatSessionId, setChatSessionId] = useState<string>('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Check if we already have a session ID in localStorage
        const storedSessionId = localStorage.getItem('chat_session_id');
        if (storedSessionId) {
          console.log("[useChatSession] Using cached session ID:", storedSessionId);
          setChatSessionId(storedSessionId);
          return;
        }

        // If not, fetch a new one from the backend
        const res = await fetch('/api/chat/session');
        if (res.ok) {
          const data = await res.json();
          const newSessionId = data.session_id;
          setChatSessionId(newSessionId);
          // Store it for future use
          localStorage.setItem('chat_session_id', newSessionId);
          console.log("[useChatSession] New session ID created:", newSessionId);
        }
      } catch (err) {
        console.error("[useChatSession] Failed to initialize session:", err);
      }
    };

    fetchSession();
  }, []);

  return {
    chatSessionId,
    setChatSessionId
  };
}
