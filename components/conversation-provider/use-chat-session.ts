import { useState, useEffect } from 'react';

export function useChatSession() {
  const [chatSessionId, setChatSessionId] = useState<string>('');

  useEffect(() => {
    // Don't fetch session if we don't have a user context yet (prevents middleware redirects)
    const fetchSession = async () => {
      try {
        const storedSessionId = localStorage.getItem('chat_session_id');
        if (storedSessionId) {
          setChatSessionId(storedSessionId);
          return;
        }

        const res = await fetch('/api/chat/session');
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            const newSessionId = data.session_id;
            setChatSessionId(newSessionId);
            localStorage.setItem('chat_session_id', newSessionId);
            console.log("[useChatSession] New session ID created:", newSessionId);
          } else {
            console.warn("[useChatSession] Received non-JSON response from session API");
          }
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
